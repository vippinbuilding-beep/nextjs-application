import "server-only";

import type { NotificationType } from "@/core/models/notification";
import { formatBRL } from "@/lib/money";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    console.error("[notifications] failed to create:", error.message);
  }
}

export async function notifyAskMeNewQuestion(input: {
  creatorId: string;
  questionId: string;
  askerName: string;
  amountCents: number;
}): Promise<void> {
  await createNotification({
    userId: input.creatorId,
    type: "ask_me_new_question",
    title: "Nova pergunta paga",
    body: `${input.askerName} enviou uma pergunta de ${formatBRL(input.amountCents)}. Você tem 72h para responder.`,
    href: "/profile/ask-me",
    metadata: { questionId: input.questionId },
  });
}

export async function notifyAskMeAnswered(input: {
  askerId: string;
  questionId: string;
  creatorName: string;
}): Promise<void> {
  await createNotification({
    userId: input.askerId,
    type: "ask_me_answered",
    title: "Sua pergunta foi respondida",
    body: `@${input.creatorName} respondeu sua pergunta no Me pergunte.`,
    href: "/my-questions",
    metadata: { questionId: input.questionId },
  });
}

export async function notifyAskMeRefunded(input: {
  askerId: string;
  questionId: string;
  creatorName: string;
  reason: "declined" | "expired";
}): Promise<void> {
  const reasonLabel =
    input.reason === "declined"
      ? "foi recusada pelo criador"
      : "expirou o prazo de 72h sem resposta";

  await createNotification({
    userId: input.askerId,
    type: "ask_me_refunded",
    title: "Estorno do Me pergunte",
    body: `Sua pergunta para @${input.creatorName} ${reasonLabel}. O valor foi estornado para sua chave PIX.`,
    href: "/my-questions",
    metadata: { questionId: input.questionId, reason: input.reason },
  });
}

export async function notifyAskMePaymentConfirmed(input: {
  askerId: string;
  questionId: string;
  creatorName: string;
}): Promise<void> {
  await createNotification({
    userId: input.askerId,
    type: "ask_me_payment_confirmed",
    title: "Pergunta enviada",
    body: `Pagamento confirmado! @${input.creatorName} tem até 72h para responder.`,
    href: "/my-questions",
    metadata: { questionId: input.questionId },
  });
}
