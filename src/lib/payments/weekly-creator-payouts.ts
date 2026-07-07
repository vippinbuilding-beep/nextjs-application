import "server-only";

import type { PixKeyType } from "@/core/models/user";
import { SupabaseAskMeQuestionRepository } from "@/infrastructure/supabase/supabase-ask-me-repository";
import {
  notifyWeeklyCreatorPayoutFailed,
  notifyWeeklyCreatorPayoutSent,
} from "@/lib/notifications/dispatch";
import { refundAskMeQuestion } from "@/lib/payments/ask-me-finalize";
import { creatorWithdrawNetCents, pixSendGrossCents } from "@/lib/payments/split";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrderRepository, getPaymentGateway } from "@/services/payment-factory";

/** AbacatePay `/pix/send` minimum transfer amount (R$ 1,00). */
const MIN_PAYOUT_NET_CENTS = 100;

/** Max rows loaded per source table per run (serverless safety). */
export const WEEKLY_PAYOUTS_BATCH_LIMIT = 500;

const NON_RETRYABLE_PAYOUT_ERRORS = new Set([
  "Criador sem chave PIX cadastrada.",
  "Chave PIX do perguntador ausente para estorno.",
]);

export interface WeeklyPayoutCreatorResult {
  creatorId: string;
  ok: boolean;
  netCents?: number;
  orderCount?: number;
  askMeCount?: number;
  abacateTransferId?: string;
  error?: string;
}

export interface WeeklyPayoutsSummary {
  creatorsProcessed: number;
  creatorsSucceeded: number;
  creatorsFailed: number;
  creatorsSkipped: number;
  ordersSettled: number;
  askMeSettled: number;
  refundsRetried: number;
  refundsSucceeded: number;
  results: WeeklyPayoutCreatorResult[];
}

interface CreatorBatch {
  creatorId: string;
  orderIds: string[];
  askMeQuestionIds: string[];
  netCents: number;
}

/**
 * Runs the weekly creator repass: aggregates all pending product sales and
 * answered Me Pergunte questions per creator into a single PIX transfer (one
 * AbacatePay fee per creator). Also retries failed ask-me refunds individually.
 */
export async function runWeeklyCreatorPayouts(
  options: { batchLimit?: number } = {}
): Promise<WeeklyPayoutsSummary> {
  const batchLimit = options.batchLimit ?? WEEKLY_PAYOUTS_BATCH_LIMIT;
  const admin = createSupabaseAdminClient();
  const orderRepo = getOrderRepository();
  const askMeRepo = new SupabaseAskMeQuestionRepository(admin);

  const [orders, askMeQuestions, failedRefunds] = await Promise.all([
    orderRepo.listPendingCreatorRepasses(batchLimit),
    askMeRepo.listPendingCreatorRepasses(batchLimit),
    askMeRepo.listFailedRefunds(20, 0),
  ]);

  const summary: WeeklyPayoutsSummary = {
    creatorsProcessed: 0,
    creatorsSucceeded: 0,
    creatorsFailed: 0,
    creatorsSkipped: 0,
    ordersSettled: 0,
    askMeSettled: 0,
    refundsRetried: 0,
    refundsSucceeded: 0,
    results: [],
  };

  for (const question of failedRefunds) {
    if (
      question.transferError &&
      NON_RETRYABLE_PAYOUT_ERRORS.has(question.transferError)
    ) {
      continue;
    }
    summary.refundsRetried += 1;
    const reason =
      question.responseDeadlineAt &&
      question.responseDeadlineAt.getTime() < Date.now()
        ? "expired"
        : "declined";
    const result = await refundAskMeQuestion(question.id, reason);
    if (result?.transferStatus === "refunded") {
      summary.refundsSucceeded += 1;
    }
  }

  const batches = groupByCreator(orders, askMeQuestions);
  const gateway = getPaymentGateway();
  const weekKey = formatWeekKey(new Date());

  for (const batch of batches.values()) {
    summary.creatorsProcessed += 1;

    const withdrawNetCents = creatorWithdrawNetCents(batch.netCents);

    if (withdrawNetCents < MIN_PAYOUT_NET_CENTS) {
      summary.creatorsSkipped += 1;
      summary.results.push({
        creatorId: batch.creatorId,
        ok: false,
        error: "Saldo abaixo do mínimo de R$ 1,00 — aguardando próximo ciclo.",
      });
      continue;
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("pix_key, pix_key_type")
      .eq("id", batch.creatorId)
      .maybeSingle();

    if (profileError || !profile?.pix_key || !profile.pix_key_type) {
      const message = "Criador sem chave PIX cadastrada.";
      await markCreatorBatchFailed(admin, batch, message);
      summary.creatorsFailed += 1;
      await notifyWeeklyCreatorPayoutFailed({
        creatorId: batch.creatorId,
        netCents: withdrawNetCents,
        orderCount: batch.orderIds.length,
        askMeCount: batch.askMeQuestionIds.length,
        error: message,
      });
      summary.results.push({ creatorId: batch.creatorId, ok: false, error: message });
      continue;
    }

    try {
      const transfer = await gateway.sendPix({
        amountCents: pixSendGrossCents(withdrawNetCents),
        externalId: `weekly-${batch.creatorId}-${weekKey}`,
        description: "Repasse semanal Vippin",
        pixKey: profile.pix_key,
        pixKeyType: profile.pix_key_type.toUpperCase() as PixKeyType,
      });

      await markCreatorBatchSent(admin, batch, transfer.id);

      summary.creatorsSucceeded += 1;
      summary.ordersSettled += batch.orderIds.length;
      summary.askMeSettled += batch.askMeQuestionIds.length;

      await notifyWeeklyCreatorPayoutSent({
        creatorId: batch.creatorId,
        netCents: withdrawNetCents,
        orderCount: batch.orderIds.length,
        askMeCount: batch.askMeQuestionIds.length,
      });

      summary.results.push({
        creatorId: batch.creatorId,
        ok: true,
        netCents: withdrawNetCents,
        orderCount: batch.orderIds.length,
        askMeCount: batch.askMeQuestionIds.length,
        abacateTransferId: transfer.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no repasse PIX.";
      await markCreatorBatchFailed(admin, batch, message);
      summary.creatorsFailed += 1;
      await notifyWeeklyCreatorPayoutFailed({
        creatorId: batch.creatorId,
        netCents: withdrawNetCents,
        orderCount: batch.orderIds.length,
        askMeCount: batch.askMeQuestionIds.length,
        error: message,
      });
      summary.results.push({ creatorId: batch.creatorId, ok: false, error: message });
    }
  }

  return summary;
}

function groupByCreator(
  orders: { id: string; creatorId: string; creatorAmountCents: number }[],
  questions: { id: string; creatorId: string; creatorAmountCents: number }[]
): Map<string, CreatorBatch> {
  const batches = new Map<string, CreatorBatch>();

  for (const order of orders) {
    const existing = batches.get(order.creatorId) ?? {
      creatorId: order.creatorId,
      orderIds: [],
      askMeQuestionIds: [],
      netCents: 0,
    };
    existing.orderIds.push(order.id);
    existing.netCents += order.creatorAmountCents;
    batches.set(order.creatorId, existing);
  }

  for (const question of questions) {
    const existing = batches.get(question.creatorId) ?? {
      creatorId: question.creatorId,
      orderIds: [],
      askMeQuestionIds: [],
      netCents: 0,
    };
    existing.askMeQuestionIds.push(question.id);
    existing.netCents += question.creatorAmountCents;
    batches.set(question.creatorId, existing);
  }

  return batches;
}

function formatWeekKey(date: Date): string {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function markCreatorBatchSent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  batch: CreatorBatch,
  transferId: string
): Promise<void> {
  const patch = {
    transfer_status: "sent",
    abacate_transfer_id: transferId,
    transfer_error: null,
  };

  if (batch.orderIds.length > 0) {
    const { error } = await admin
      .from("orders")
      .update(patch)
      .in("id", batch.orderIds);
    if (error) throw new Error(error.message);
  }

  if (batch.askMeQuestionIds.length > 0) {
    const { error } = await admin
      .from("ask_me_questions")
      .update(patch)
      .in("id", batch.askMeQuestionIds);
    if (error) throw new Error(error.message);
  }
}

async function markCreatorBatchFailed(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  batch: CreatorBatch,
  message: string
): Promise<void> {
  const patch = {
    transfer_status: "failed",
    transfer_error: message,
  };

  if (batch.orderIds.length > 0) {
    await admin.from("orders").update(patch).in("id", batch.orderIds);
  }
  if (batch.askMeQuestionIds.length > 0) {
    await admin.from("ask_me_questions").update(patch).in("id", batch.askMeQuestionIds);
  }
}
