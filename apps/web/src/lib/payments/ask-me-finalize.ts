import "server-only";

import type { AskMeQuestion } from "@vippin/core/models/ask-me-question";
import type { PixKeyType } from "@vippin/core/models/user";
import {
  getAskMeWithRefund,
  SupabaseAskMeQuestionRepository,
} from "@vippin/supabase/infrastructure/supabase/supabase-ask-me-repository";
import { ASK_ME_LIMITS } from "@vippin/core/domain/ask-me";
import {
  notifyAskMeNewQuestion,
  notifyAskMePaymentConfirmed,
  notifyAskMeExpiredToCreator,
  notifyAskMeRefunded,
} from "@/lib/notifications/dispatch";
import { pixSendGrossCents } from "@/lib/payments/split";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { getPaymentGateway } from "@vippin/supabase/factories/payment-factory";

function getRepo() {
  return new SupabaseAskMeQuestionRepository(createSupabaseAdminClient());
}

/**
 * Confirms PIX payment for an ask-me question. Funds stay held on the platform
 * until the creator answers or the 72h deadline passes.
 */
export async function finalizeAskMeQuestion(
  questionId: string
): Promise<AskMeQuestion | null> {
  const repo = getRepo();
  const gateway = getPaymentGateway();

  const question = await repo.getById(questionId);
  if (!question) return null;
  if (question.status !== "pending_payment") return question;
  if (!question.abacateChargeId) return question;

  const status = await gateway.getPixChargeStatus(question.abacateChargeId);

  if (status === "expired" || status === "cancelled") {
    return (
      (await repo.update(questionId, { status: "payment_expired" })) ?? question
    );
  }
  if (status !== "paid") return question;

  const paid = await repo.transitionToAwaitingResponse(questionId);
  if (paid) {
    await sendAskMePaidNotifications(paid);
  }
  return paid ?? repo.getById(questionId);
}

async function sendAskMePaidNotifications(question: AskMeQuestion): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name, display_name, creator_name")
    .in("id", [question.creatorId, question.askerId]);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const asker = byId.get(question.askerId);
  const creator = byId.get(question.creatorId);
  const askerName =
    asker?.name ?? asker?.display_name ?? "Alguém";
  const creatorName =
    creator?.creator_name ?? creator?.name ?? "criador";

  await Promise.all([
    notifyAskMeNewQuestion({
      creatorId: question.creatorId,
      questionId: question.id,
      askerName,
      amountCents: question.amountCents,
    }),
    notifyAskMePaymentConfirmed({
      askerId: question.askerId,
      questionId: question.id,
      creatorName,
    }),
  ]);
}

/** Refunds held payment to the asker and marks the question expired/declined. */
export async function refundAskMeQuestion(
  questionId: string,
  reason: "declined" | "expired"
): Promise<AskMeQuestion | null> {
  const admin = createSupabaseAdminClient();
  const repo = getRepo();
  const gateway = getPaymentGateway();

  const question = await repo.getById(questionId);
  if (!question) return null;
  if (question.status !== "awaiting_response") return question;
  if (question.transferStatus === "refunded") return question;

  const targetStatus = reason === "declined" ? "declined" : "expired";
  const now = new Date();
  const refundReason =
    reason === "declined"
      ? "Pergunta recusada pelo criador — Me Pergunte Vippin"
      : "Prazo de 72h expirado — Me Pergunte Vippin";

  try {
    let refundId: string;

    if (question.abacateChargeId) {
      const refund = await gateway.refundPixCharge({
        chargeId: question.abacateChargeId,
        reason: refundReason,
      });
      refundId = refund.id;
    } else {
      const legacy = await getAskMeWithRefund(admin, questionId);
      if (!legacy?.refundPixKey || !legacy.refundPixKeyType) {
        return (
          (await repo.update(questionId, {
            status: targetStatus,
            declinedAt: reason === "declined" ? now : undefined,
            transferStatus: "failed",
            transferError: "Cobrança PIX ausente para estorno.",
          })) ?? question
        );
      }

      const transfer = await gateway.sendPix({
        amountCents: pixSendGrossCents(question.amountCents),
        externalId: `ask-me-refund-${questionId}`,
        description: "Estorno Me Pergunte — Vippin",
        pixKey: legacy.refundPixKey,
        pixKeyType: legacy.refundPixKeyType.toUpperCase() as PixKeyType,
      });
      refundId = transfer.id;
    }

    const updated =
      (await repo.update(questionId, {
        status: targetStatus,
        declinedAt: reason === "declined" ? now : undefined,
        refundedAt: now,
        transferStatus: "refunded",
        abacateTransferId: refundId,
        transferError: null,
      })) ?? question;

    if (updated) {
      await sendAskMeRefundNotification(updated, reason);
      if (reason === "expired") {
        await sendAskMeExpiredCreatorNotification(updated);
      }
    }
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no estorno PIX.";
    return (
      (await repo.update(questionId, {
        transferStatus: "failed",
        transferError: message,
      })) ?? question
    );
  }
}

/** Auto-refunds questions past the 72h deadline. Safe to call on every list/poll. */
export async function processExpiredAskMeQuestions(): Promise<void> {
  const repo = getRepo();
  const expired = await repo.listExpiredAwaitingResponse();
  for (const question of expired) {
    await refundAskMeQuestion(question.id, "expired");
  }
}

export interface AskMeExpirationsSummary {
  processed: number;
  refunded: number;
}

/** Cron entry point: expires overdue questions and refunds askers. */
export async function runAskMeExpirations(): Promise<AskMeExpirationsSummary> {
  const repo = getRepo();
  const expired = await repo.listExpiredAwaitingResponse();
  const summary: AskMeExpirationsSummary = {
    processed: expired.length,
    refunded: 0,
  };

  for (const question of expired) {
    const result = await refundAskMeQuestion(question.id, "expired");
    if (result?.transferStatus === "refunded") {
      summary.refunded += 1;
    }
  }

  return summary;
}

export { ASK_ME_LIMITS };

async function sendAskMeRefundNotification(
  question: AskMeQuestion,
  reason: "declined" | "expired"
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: creator } = await admin
    .from("profiles")
    .select("creator_name, name")
    .eq("id", question.creatorId)
    .maybeSingle();

  const creatorName = creator?.creator_name ?? creator?.name ?? "criador";

  await notifyAskMeRefunded({
    askerId: question.askerId,
    questionId: question.id,
    creatorName,
    reason,
  });
}

async function sendAskMeExpiredCreatorNotification(
  question: AskMeQuestion
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: asker } = await admin
    .from("profiles")
    .select("name, display_name, consumer_name")
    .eq("id", question.askerId)
    .maybeSingle();

  const askerName =
    asker?.consumer_name ?? asker?.name ?? asker?.display_name ?? "Alguém";

  await notifyAskMeExpiredToCreator({
    creatorId: question.creatorId,
    questionId: question.id,
    askerName,
    amountCents: question.amountCents,
  });
}
