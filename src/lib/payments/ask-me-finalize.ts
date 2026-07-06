import "server-only";

import type { AskMeQuestion } from "@/core/models/ask-me-question";
import type { PixKeyType } from "@/core/models/user";
import {
  getAskMeWithRefund,
  SupabaseAskMeQuestionRepository,
} from "@/infrastructure/supabase/supabase-ask-me-repository";
import { ASK_ME_LIMITS } from "@/lib/ask-me";
import {
  notifyAskMeNewQuestion,
  notifyAskMePaymentConfirmed,
  notifyAskMeRefunded,
  notifyPixTransferFailed,
  notifyPixTransferSent,
} from "@/lib/notifications/dispatch";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPaymentGateway } from "@/services/payment-factory";

const MIN_TRANSFER_CENTS = 100;

function askMeQuestionLabel(questionText: string): string {
  const trimmed = questionText.trim();
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.slice(0, 57)}...`;
}

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

  const question = await getAskMeWithRefund(admin, questionId);
  if (!question) return null;
  if (question.status !== "awaiting_response") return question;
  if (question.transferStatus === "refunded") return question;

  const targetStatus = reason === "declined" ? "declined" : "expired";
  const now = new Date();

  if (!question.refundPixKey || !question.refundPixKeyType) {
    return (
      (await repo.update(questionId, {
        status: targetStatus,
        declinedAt: reason === "declined" ? now : undefined,
        transferStatus: "failed",
        transferError: "Chave PIX do perguntador ausente para estorno.",
      })) ?? question
    );
  }

  try {
    const transfer = await gateway.sendPix({
      amountCents: question.amountCents,
      externalId: `ask-me-refund-${questionId}`,
      description: "Estorno Me Pergunte — Vippin",
      pixKey: question.refundPixKey,
      pixKeyType: question.refundPixKeyType.toUpperCase() as PixKeyType,
    });

    const updated =
      (await repo.update(questionId, {
        status: targetStatus,
        declinedAt: reason === "declined" ? now : undefined,
        refundedAt: now,
        transferStatus: "refunded",
        abacateTransferId: transfer.id,
        transferError: null,
      })) ?? question;

    if (updated) {
      await sendAskMeRefundNotification(updated, reason);
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

/** Repasses the creator's 90% after they answer. */
export async function repassAskMeToCreator(
  questionId: string
): Promise<AskMeQuestion | null> {
  const repo = getRepo();
  const gateway = getPaymentGateway();
  const admin = createSupabaseAdminClient();

  const question = await repo.getById(questionId);
  if (!question) return null;
  if (question.status !== "answered") return question;
  if (question.transferStatus === "sent") return question;

  const previousTransferStatus = question.transferStatus;
  const label = askMeQuestionLabel(question.questionText);

  const fail = async (message: string) => {
    const updated =
      (await repo.update(questionId, {
        transferStatus: "failed",
        transferError: message,
      })) ?? question;

    if (previousTransferStatus !== "failed") {
      await notifyPixTransferFailed({
        creatorId: question.creatorId,
        kind: "ask_me",
        entityId: question.id,
        amountCents: question.creatorAmountCents,
        label,
        error: message,
      });
    }

    return updated;
  };

  if (question.creatorAmountCents < MIN_TRANSFER_CENTS) {
    return fail("Valor do repasse abaixo do mínimo de R$ 1,00.");
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("pix_key, pix_key_type")
    .eq("id", question.creatorId)
    .maybeSingle();

  if (error || !profile?.pix_key || !profile.pix_key_type) {
    return fail("Criador sem chave PIX cadastrada.");
  }

  try {
    const transfer = await gateway.sendPix({
      amountCents: question.creatorAmountCents,
      externalId: `ask-me-${questionId}`,
      description: "Me Pergunte — Vippin",
      pixKey: profile.pix_key,
      pixKeyType: profile.pix_key_type.toUpperCase() as PixKeyType,
    });

    const updated =
      (await repo.update(questionId, {
        transferStatus: "sent",
        abacateTransferId: transfer.id,
        transferError: null,
      })) ?? question;

    await notifyPixTransferSent({
      creatorId: question.creatorId,
      kind: "ask_me",
      entityId: question.id,
      amountCents: question.creatorAmountCents,
      label,
    });

    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no repasse PIX.";
    return fail(message);
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
