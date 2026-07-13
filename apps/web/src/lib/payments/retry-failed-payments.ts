import "server-only";

import { randomUUID } from "crypto";

import type { PixKeyType } from "@vippin/core/models/user";
import { SupabaseAskMeQuestionRepository } from "@vippin/supabase/infrastructure/supabase/supabase-ask-me-repository";
import {
  notifyCreatorWithdrawFailed,
  notifyCreatorWithdrawSent,
  notifyPixTransferSent,
} from "@/lib/notifications/dispatch";
import { refundAskMeQuestion } from "@/lib/payments/ask-me-finalize";
import { creatorWithdrawNetCents, pixSendGrossCents } from "@/lib/payments/split";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { getOrderRepository, getPaymentGateway } from "@vippin/supabase/factories/payment-factory";

const BATCH_LIMIT = 100;
const MIN_RETRY_AGE_MS = 5 * 60 * 1000;

const NON_RETRYABLE_ERRORS = new Set([
  "Criador sem chave PIX cadastrada.",
  "Cobrança PIX ausente para estorno.",
  "Cadastre sua chave PIX em Editar perfil antes de sacar.",
]);

export interface RetryFailedPaymentsSummary {
  askMeRefundsRetried: number;
  askMeRefundsSucceeded: number;
  creatorRepassesRetried: number;
  creatorRepassesSucceeded: number;
}

interface CreatorFailedBatch {
  creatorId: string;
  orderIds: string[];
  askMeQuestionIds: string[];
  netCents: number;
}

/**
 * Retries only failed PIX operations — ask-me refunds to askers and creator
 * repasses for product sales / answered Me Pergunte. Does not process new
 * pending payouts (creators withdraw manually).
 */
export async function runRetryFailedPayments(): Promise<RetryFailedPaymentsSummary> {
  const admin = createSupabaseAdminClient();
  const orderRepo = getOrderRepository();
  const askMeRepo = new SupabaseAskMeQuestionRepository(admin);
  const gateway = getPaymentGateway();

  const summary: RetryFailedPaymentsSummary = {
    askMeRefundsRetried: 0,
    askMeRefundsSucceeded: 0,
    creatorRepassesRetried: 0,
    creatorRepassesSucceeded: 0,
  };

  const failedRefunds = await askMeRepo.listFailedRefunds(
    BATCH_LIMIT,
    MIN_RETRY_AGE_MS
  );

  for (const question of failedRefunds) {
    if (question.transferError && NON_RETRYABLE_ERRORS.has(question.transferError)) {
      continue;
    }

    summary.askMeRefundsRetried += 1;
    const reason =
      question.responseDeadlineAt &&
      question.responseDeadlineAt.getTime() < Date.now()
        ? "expired"
        : "declined";
    const result = await refundAskMeQuestion(question.id, reason);
    if (result?.transferStatus === "refunded") {
      summary.askMeRefundsSucceeded += 1;
    }
  }

  const [failedOrders, failedAskMeRepasses] = await Promise.all([
    orderRepo.listFailedCreatorRepasses(BATCH_LIMIT, MIN_RETRY_AGE_MS),
    askMeRepo.listFailedCreatorRepasses(BATCH_LIMIT, MIN_RETRY_AGE_MS),
  ]);

  const batches = groupFailedByCreator(failedOrders, failedAskMeRepasses);

  for (const batch of batches.values()) {
    if (batch.netCents <= 0) continue;

    summary.creatorRepassesRetried += 1;
    const withdrawNetCents = creatorWithdrawNetCents(batch.netCents);

    if (withdrawNetCents < 100) continue;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("pix_key, pix_key_type")
      .eq("id", batch.creatorId)
      .maybeSingle();

    if (profileError || !profile?.pix_key || !profile.pix_key_type) {
      const message = "Criador sem chave PIX cadastrada.";
      await markCreatorBatchFailed(admin, batch, message);
      await notifyCreatorWithdrawFailed({
        creatorId: batch.creatorId,
        netCents: withdrawNetCents,
        orderCount: batch.orderIds.length,
        askMeCount: batch.askMeQuestionIds.length,
        error: message,
      });
      continue;
    }

    try {
      const transfer = await gateway.sendPix({
        amountCents: pixSendGrossCents(withdrawNetCents),
        externalId: `retry-${batch.creatorId}-${randomUUID()}`,
        description: "Repasse Vippin (retry)",
        pixKey: profile.pix_key,
        pixKeyType: profile.pix_key_type.toUpperCase() as PixKeyType,
      });

      await markCreatorBatchSent(admin, batch, transfer.id);
      summary.creatorRepassesSucceeded += 1;

      if (batch.orderIds.length > 0 && batch.askMeQuestionIds.length > 0) {
        await notifyCreatorWithdrawSent({
          creatorId: batch.creatorId,
          netCents: withdrawNetCents,
          orderCount: batch.orderIds.length,
          askMeCount: batch.askMeQuestionIds.length,
        });
      } else if (batch.orderIds.length > 0) {
        await notifyPixTransferSent({
          creatorId: batch.creatorId,
          kind: "order",
          entityId: batch.orderIds[0],
          amountCents: withdrawNetCents,
          label: `${batch.orderIds.length} venda(s)`,
        });
      } else {
        await notifyPixTransferSent({
          creatorId: batch.creatorId,
          kind: "ask_me",
          entityId: batch.askMeQuestionIds[0],
          amountCents: withdrawNetCents,
          label: `${batch.askMeQuestionIds.length} Me pergunte`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no repasse PIX.";
      await markCreatorBatchFailed(admin, batch, message);
      await notifyCreatorWithdrawFailed({
        creatorId: batch.creatorId,
        netCents: withdrawNetCents,
        orderCount: batch.orderIds.length,
        askMeCount: batch.askMeQuestionIds.length,
        error: message,
      });
    }
  }

  return summary;
}

function groupFailedByCreator(
  orders: { id: string; creatorId: string; creatorAmountCents: number }[],
  questions: { id: string; creatorId: string; creatorAmountCents: number }[]
): Map<string, CreatorFailedBatch> {
  const batches = new Map<string, CreatorFailedBatch>();

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

async function markCreatorBatchSent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  batch: CreatorFailedBatch,
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
  batch: CreatorFailedBatch,
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
