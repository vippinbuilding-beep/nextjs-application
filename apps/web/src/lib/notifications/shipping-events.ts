import "server-only";

import type { NotificationType } from "@vippin/core/models/notification";
import type { Order } from "@vippin/core/models/order";
import { formatBRL } from "@vippin/core/domain/money";
import { createNotification } from "@/lib/notifications/dispatch";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";

export const BUYER_ORDERS_PATH = "/my-orders";
export const CREATOR_SHIPMENTS_PATH = "/painel/envios";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/**
 * Creates a notification at most once per (user, type, order). Webhooks and
 * crons repeat; this keeps the inbox clean without extra state.
 */
async function notifyOnce(input: {
  userId: string;
  type: NotificationType;
  orderId: string;
  title: string;
  body: string;
  href: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("type", input.type)
    .eq("metadata->>orderId", input.orderId);
  if ((count ?? 0) > 0) return;

  await createNotification({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    metadata: { ...(input.metadata ?? {}), orderId: input.orderId },
  });
}

export async function fetchProductTitle(productId: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("products")
    .select("title")
    .eq("id", productId)
    .maybeSingle();
  return data?.title ?? "seu produto";
}

export async function notifyPhysicalOrderPaid(order: Order): Promise<void> {
  const title = await fetchProductTitle(order.productId);
  const deadline = order.prepareDeadlineAt ? formatDate(order.prepareDeadlineAt) : null;

  await Promise.all([
    notifyOnce({
      userId: order.buyerId,
      type: "physical_order_paid",
      orderId: order.id,
      title: "Pagamento confirmado",
      body: `Seu pedido de "${title}" foi pago. Você recebe o código de rastreio assim que o envio for preparado.`,
      href: BUYER_ORDERS_PATH,
    }),
    notifyOnce({
      userId: order.creatorId,
      type: "physical_sale",
      orderId: order.id,
      title: "Nova venda de produto físico",
      body: deadline
        ? `Você vendeu "${title}". Prepare o envio até ${deadline}.`
        : `Você vendeu "${title}". Prepare o envio no painel.`,
      href: CREATOR_SHIPMENTS_PATH,
      metadata: { amountCents: order.amountCents },
    }),
  ]);
}

export async function notifyShipmentDeadlineSoon(
  order: Order,
  kind: "prepare" | "post"
): Promise<void> {
  const title = await fetchProductTitle(order.productId);
  const deadline = kind === "prepare" ? order.prepareDeadlineAt : order.postDeadlineAt;
  await notifyOnce({
    userId: order.creatorId,
    type: "shipment_deadline_soon",
    orderId: `${order.id}:${kind}`,
    title: kind === "prepare" ? "Prepare o envio" : "Poste o pacote",
    body:
      kind === "prepare"
        ? `O prazo para preparar o envio de "${title}" termina ${deadline ? `em ${formatDate(deadline)}` : "em breve"}. Depois disso o comprador é reembolsado.`
        : `A etiqueta de "${title}" vence ${deadline ? `em ${formatDate(deadline)}` : "em breve"}. Poste o pacote para não perder a venda.`,
    href: CREATOR_SHIPMENTS_PATH,
  });
}

export async function notifyShipmentLabelReady(
  order: Order,
  trackingCode?: string
): Promise<void> {
  const title = await fetchProductTitle(order.productId);
  await notifyOnce({
    userId: order.buyerId,
    type: "shipment_label_ready",
    orderId: order.id,
    title: "Seu pedido está sendo preparado",
    body: trackingCode
      ? `"${title}" já tem etiqueta. Código de rastreio: ${trackingCode}.`
      : `"${title}" já tem etiqueta e logo será postado.`,
    href: BUYER_ORDERS_PATH,
  });
}

export async function notifyShipmentPosted(order: Order, trackingCode?: string): Promise<void> {
  const title = await fetchProductTitle(order.productId);
  await notifyOnce({
    userId: order.buyerId,
    type: "shipment_posted",
    orderId: order.id,
    title: "Pedido enviado",
    body: trackingCode
      ? `"${title}" foi postado. Rastreio: ${trackingCode}.`
      : `"${title}" foi postado e está a caminho.`,
    href: BUYER_ORDERS_PATH,
  });
}

export async function notifyShipmentDelivered(order: Order): Promise<void> {
  const title = await fetchProductTitle(order.productId);
  await Promise.all([
    notifyOnce({
      userId: order.buyerId,
      type: "shipment_delivered",
      orderId: order.id,
      title: "Pedido entregue",
      body: `"${title}" foi entregue. Aproveite!`,
      href: BUYER_ORDERS_PATH,
    }),
    notifyOnce({
      userId: order.creatorId,
      type: "shipment_delivered",
      orderId: order.id,
      title: "Entrega confirmada",
      body: `"${title}" foi entregue ao comprador.`,
      href: CREATOR_SHIPMENTS_PATH,
    }),
  ]);
}

export async function notifyOrderReleased(order: Order): Promise<void> {
  const title = await fetchProductTitle(order.productId);
  await notifyOnce({
    userId: order.creatorId,
    type: "order_released",
    orderId: order.id,
    title: "Saldo liberado",
    body: `${formatBRL(order.creatorAmountCents)} da venda de "${title}" já está disponível para saque.`,
    href: "/painel/financeiro",
  });
}

export type RefundReason =
  | "not_prepared"
  | "not_posted"
  | "returned"
  | "out_of_stock"
  | "admin"
  | "creator_canceled";

const REFUND_REASON_LABEL: Record<RefundReason, string> = {
  not_prepared: "o envio não foi preparado no prazo",
  not_posted: "o pacote não foi postado no prazo",
  returned: "a entrega não foi concluída",
  out_of_stock: "o produto esgotou",
  admin: "a equipe Vippin cancelou o pedido",
  creator_canceled: "o criador cancelou o pedido",
};

export async function notifyOrderRefunded(order: Order, reason: RefundReason): Promise<void> {
  const title = await fetchProductTitle(order.productId);
  const label = REFUND_REASON_LABEL[reason];
  await Promise.all([
    notifyOnce({
      userId: order.buyerId,
      type: "order_refunded",
      orderId: order.id,
      title: "Pedido reembolsado",
      body: `Seu pedido de "${title}" foi reembolsado (${formatBRL(order.amountCents)}) porque ${label}.`,
      href: BUYER_ORDERS_PATH,
      metadata: { reason },
    }),
    notifyOnce({
      userId: order.creatorId,
      type: "order_refunded",
      orderId: order.id,
      title: "Venda reembolsada",
      body: `A venda de "${title}" foi reembolsada ao comprador porque ${label}.`,
      href: CREATOR_SHIPMENTS_PATH,
      metadata: { reason },
    }),
  ]);
}

export async function notifyShipmentProblem(
  order: Order,
  message: string
): Promise<void> {
  const title = await fetchProductTitle(order.productId);
  await notifyOnce({
    userId: order.creatorId,
    type: "shipment_problem",
    orderId: order.id,
    title: "Problema no envio",
    body: `"${title}": ${message}`,
    href: CREATOR_SHIPMENTS_PATH,
  });
}
