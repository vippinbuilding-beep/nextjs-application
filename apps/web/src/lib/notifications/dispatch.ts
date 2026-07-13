import "server-only";

import type { NotificationType } from "@vippin/core/models/notification";
import { formatBRL } from "@vippin/core/domain/money";
import { ABACATEPAY_PIX_SEND_FEE_CENTS } from "@/lib/payments/platform-fee";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";

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

export function productPublicPath(
  creatorSlug: string,
  productSlug: string
): string {
  return `/@${creatorSlug}/${productSlug}`;
}

// ── Me Pergunte ─────────────────────────────────────────────────────────────

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
    body: `Sua pergunta para @${input.creatorName} ${reasonLabel}. O valor foi estornado automaticamente.`,
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

export async function notifyAskMeExpiredToCreator(input: {
  creatorId: string;
  questionId: string;
  askerName: string;
  amountCents: number;
}): Promise<void> {
  await createNotification({
    userId: input.creatorId,
    type: "ask_me_expired",
    title: "Prazo do Me pergunte esgotado",
    body: `A pergunta de ${input.askerName} (${formatBRL(input.amountCents)}) expirou sem resposta. O valor foi estornado automaticamente.`,
    href: "/profile/ask-me",
    metadata: { questionId: input.questionId },
  });
}

// ── Produtos ────────────────────────────────────────────────────────────────

export async function notifyProductPurchaseConfirmed(input: {
  buyerId: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productHref: string;
}): Promise<void> {
  await createNotification({
    userId: input.buyerId,
    type: "product_purchase_confirmed",
    title: "Compra confirmada",
    body: `Você agora tem acesso a "${input.productTitle}".`,
    href: input.productHref,
    metadata: {
      orderId: input.orderId,
      productId: input.productId,
    },
  });
}

export async function notifyProductSale(input: {
  creatorId: string;
  orderId: string;
  productId: string;
  productTitle: string;
  buyerName: string;
  amountCents: number;
}): Promise<void> {
  await createNotification({
    userId: input.creatorId,
    type: "product_sale",
    title: "Nova venda",
    body: `${input.buyerName} comprou "${input.productTitle}" por ${formatBRL(input.amountCents)}.`,
    href: "/my-products",
    metadata: {
      orderId: input.orderId,
      productId: input.productId,
    },
  });
}

export async function notifyProductAccessGranted(input: {
  buyerId: string;
  productId: string;
  productTitle: string;
  productHref: string;
}): Promise<void> {
  await createNotification({
    userId: input.buyerId,
    type: "product_access_granted",
    title: "Acesso liberado",
    body: `Você aderiu a "${input.productTitle}". Aproveite o conteúdo!`,
    href: input.productHref,
    metadata: {
      productId: input.productId,
      source: "free",
    },
  });
}

export async function notifyProductFreeClaim(input: {
  creatorId: string;
  productId: string;
  productTitle: string;
  buyerName: string;
}): Promise<void> {
  await createNotification({
    userId: input.creatorId,
    type: "product_free_claim",
    title: "Nova adesão gratuita",
    body: `${input.buyerName} aderiu ao conteúdo gratuito "${input.productTitle}".`,
    href: "/my-products",
    metadata: {
      productId: input.productId,
    },
  });
}

export async function notifyProductNewComment(input: {
  creatorId: string;
  productId: string;
  commentId: string;
  productTitle: string;
  productHref: string;
  authorName: string;
}): Promise<void> {
  await createNotification({
    userId: input.creatorId,
    type: "product_new_comment",
    title: "Novo comentário",
    body: `${input.authorName} comentou em "${input.productTitle}".`,
    href: input.productHref,
    metadata: {
      productId: input.productId,
      commentId: input.commentId,
    },
  });
}

export async function notifyProductCommentReply(input: {
  recipientId: string;
  productId: string;
  commentId: string;
  productTitle: string;
  productHref: string;
  authorName: string;
}): Promise<void> {
  await createNotification({
    userId: input.recipientId,
    type: "product_comment_reply",
    title: "Resposta ao seu comentário",
    body: `${input.authorName} respondeu seu comentário em "${input.productTitle}".`,
    href: input.productHref,
    metadata: {
      productId: input.productId,
      commentId: input.commentId,
    },
  });
}

// ── Perfil ──────────────────────────────────────────────────────────────────

export async function notifyProfileOnboardingComplete(input: {
  userId: string;
  role: "creator" | "consumer";
  href: string;
}): Promise<void> {
  const body =
    input.role === "creator"
      ? "Seu perfil de criador está pronto. Compartilhe seu link e comece a vender."
      : "Seu perfil está pronto. Explore criadores e produtos.";

  await createNotification({
    userId: input.userId,
    type: "profile_onboarding_complete",
    title: "Bem-vindo ao Vippin",
    body,
    href: input.href,
    metadata: { role: input.role },
  });
}

// ── Repasse PIX ─────────────────────────────────────────────────────────────

export type PixTransferKind = "order" | "ask_me";

export async function notifyWeeklyCreatorPayoutSent(input: {
  creatorId: string;
  netCents: number;
  orderCount: number;
  askMeCount: number;
}): Promise<void> {
  const parts: string[] = [];
  if (input.orderCount > 0) {
    parts.push(
      input.orderCount === 1 ? "1 venda" : `${input.orderCount} vendas`
    );
  }
  if (input.askMeCount > 0) {
    parts.push(
      input.askMeCount === 1
        ? "1 Me pergunte"
        : `${input.askMeCount} Me pergunte`
    );
  }

  const context = parts.length > 0 ? parts.join(" e ") : "repasses pendentes";

  await createNotification({
    userId: input.creatorId,
    type: "pix_transfer_sent",
    title: "Repasse semanal enviado",
    body: `${formatBRL(input.netCents)} transferidos para sua chave PIX (${context}).`,
    href: "/",
    metadata: {
      kind: "weekly_batch",
      netCents: input.netCents,
      orderCount: input.orderCount,
      askMeCount: input.askMeCount,
    },
  });
}

export async function notifyWeeklyCreatorPayoutFailed(input: {
  creatorId: string;
  netCents: number;
  orderCount: number;
  askMeCount: number;
  error: string;
}): Promise<void> {
  await createNotification({
    userId: input.creatorId,
    type: "pix_transfer_failed",
    title: "Repasse semanal falhou",
    body: `Não foi possível transferir ${formatBRL(input.netCents)}: ${input.error}`,
    href: "/profile/edit",
    metadata: {
      kind: "weekly_batch",
      netCents: input.netCents,
      orderCount: input.orderCount,
      askMeCount: input.askMeCount,
      error: input.error,
    },
  });
}

export async function notifyCreatorWithdrawSent(input: {
  creatorId: string;
  netCents: number;
  orderCount: number;
  askMeCount: number;
}): Promise<void> {
  const parts: string[] = [];
  if (input.orderCount > 0) {
    parts.push(
      input.orderCount === 1 ? "1 venda" : `${input.orderCount} vendas`
    );
  }
  if (input.askMeCount > 0) {
    parts.push(
      input.askMeCount === 1
        ? "1 Me pergunte"
        : `${input.askMeCount} Me pergunte`
    );
  }

  const context = parts.length > 0 ? parts.join(" e ") : "repasses pendentes";

  await createNotification({
    userId: input.creatorId,
    type: "pix_transfer_sent",
    title: "Saque enviado",
    body:
      `${formatBRL(input.netCents)} transferidos para sua chave PIX (${context}). ` +
      `Taxa de transferência: ${formatBRL(ABACATEPAY_PIX_SEND_FEE_CENTS)}.`,
    href: "/painel/financeiro",
    metadata: {
      kind: "manual_withdraw",
      netCents: input.netCents,
      orderCount: input.orderCount,
      askMeCount: input.askMeCount,
    },
  });
}

export async function notifyCreatorWithdrawFailed(input: {
  creatorId: string;
  netCents: number;
  orderCount: number;
  askMeCount: number;
  error: string;
}): Promise<void> {
  await createNotification({
    userId: input.creatorId,
    type: "pix_transfer_failed",
    title: "Saque falhou",
    body: `Não foi possível transferir ${formatBRL(input.netCents)}: ${input.error}`,
    href: "/painel/financeiro",
    metadata: {
      kind: "manual_withdraw",
      netCents: input.netCents,
      orderCount: input.orderCount,
      askMeCount: input.askMeCount,
      error: input.error,
    },
  });
}

export async function notifyPixTransferSent(input: {
  creatorId: string;
  kind: PixTransferKind;
  entityId: string;
  amountCents: number;
  label: string;
}): Promise<void> {
  const context =
    input.kind === "order" ? "venda de produto" : "Me pergunte";

  await createNotification({
    userId: input.creatorId,
    type: "pix_transfer_sent",
    title: "Repasse PIX enviado",
    body: `${formatBRL(input.amountCents)} da ${context} "${input.label}" foi transferido para sua chave PIX.`,
    href: input.kind === "order" ? "/my-products" : "/profile/ask-me",
    metadata: {
      kind: input.kind,
      entityId: input.entityId,
      amountCents: input.amountCents,
    },
  });
}

export async function notifyPixTransferFailed(input: {
  creatorId: string;
  kind: PixTransferKind;
  entityId: string;
  amountCents: number;
  label: string;
  error: string;
}): Promise<void> {
  const context =
    input.kind === "order" ? "venda de produto" : "Me pergunte";

  await createNotification({
    userId: input.creatorId,
    type: "pix_transfer_failed",
    title: "Repasse PIX falhou",
    body: `Não foi possível transferir ${formatBRL(input.amountCents)} da ${context} "${input.label}": ${input.error}`,
    href: "/profile/edit",
    metadata: {
      kind: input.kind,
      entityId: input.entityId,
      amountCents: input.amountCents,
      error: input.error,
    },
  });
}
