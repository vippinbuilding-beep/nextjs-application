import "server-only";

import {
  canRequestReturn,
  validateReturnReason,
} from "@vippin/core/domain/returns";
import type { Order } from "@vippin/core/models/order";
import type { OrderReturnRequest } from "@vippin/core/models/order-return";
import { alertReturnRequested } from "@/lib/alerts/return-alert";
import { notifyReturnRequested } from "@/lib/notifications/shipping-events";
import { holdOrder } from "@/lib/payments/escrow";
import { RETURN_WINDOW_DAYS } from "@/lib/shipping/config";
import { getOrderRepository } from "@vippin/supabase/factories/payment-factory";
import {
  getOrderReturnRepository,
  getShipmentRepository,
} from "@vippin/supabase/factories/shipping-factory";

export class ReturnRequestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "ReturnRequestError";
  }
}

/** Delivery date used by the return window (from shipment tracking). */
export async function deliveredAtFor(order: Order): Promise<Date | null> {
  const shipment = await getShipmentRepository().getByOrderId(order.id);
  return shipment?.deliveredAt ?? null;
}

/** States in which the creator's share is still with the platform. */
function isReturnable(order: Order): boolean {
  return (
    order.status === "paid" &&
    (order.fulfillmentStatus === "delivered" ||
      (order.fulfillmentStatus === "released" && order.transferStatus === "pending"))
  );
}

/**
 * Buyer's "Quero devolver" (arrependimento, MVP manual). Within the window
 * after delivery it holds the escrow (admin_hold_at, which blocks the
 * automatic release), records the request, tells the creator and alerts the
 * team on Discord. The return itself (reverse label, refund, charging the
 * creator for the freight) is operated by an admin in the dashboard.
 */
export async function requestReturn(input: {
  orderId: string;
  buyerId: string;
  reason: string;
  now?: Date;
}): Promise<OrderReturnRequest> {
  const now = input.now ?? new Date();
  const reasonError = validateReturnReason(input.reason);
  if (reasonError) throw new ReturnRequestError(reasonError);

  const orders = getOrderRepository();
  const order = await orders.getById(input.orderId);
  if (!order || order.buyerId !== input.buyerId) {
    throw new ReturnRequestError("Pedido não encontrado.", 404);
  }

  const returns = getOrderReturnRepository();
  if (await returns.getByOrderId(order.id)) {
    throw new ReturnRequestError("Você já pediu a devolução deste pedido.", 409);
  }
  if (!isReturnable(order)) {
    throw new ReturnRequestError("Este pedido não pode mais ser devolvido pelo site. Fale com o suporte.", 409);
  }
  const deliveredAt = await deliveredAtFor(order);
  if (!canRequestReturn(deliveredAt, now, RETURN_WINDOW_DAYS)) {
    throw new ReturnRequestError(
      `O prazo para pedir a devolução é de ${RETURN_WINDOW_DAYS} dias após a entrega.`,
      409
    );
  }

  // Hold first: if the share was already withdrawn, refuse before recording.
  const actor = { kind: "buyer" as const, userId: input.buyerId };
  await holdOrder(order.id, actor, "devolução solicitada pelo comprador");
  const held = await orders.getById(order.id);
  if (!held?.adminHoldAt) {
    throw new ReturnRequestError("Este pedido não pode mais ser devolvido pelo site. Fale com o suporte.", 409);
  }

  const request = await returns.create({
    orderId: order.id,
    buyerId: input.buyerId,
    creatorId: order.creatorId,
    reason: input.reason,
  });
  if (!request) throw new ReturnRequestError("Você já pediu a devolução deste pedido.", 409);

  await Promise.all([
    notifyReturnRequested(held, request.reason).catch((err) =>
      console.error("[returns] notify failed:", err instanceof Error ? err.message : err)
    ),
    alertReturnRequested(request, held, deliveredAt).then(async (sent) => {
      if (sent) await returns.markAlerted([request.id], now).catch(() => undefined);
    }),
  ]);
  return request;
}
