import "server-only";

import type { Order } from "@/core/models/order";
import { sendOrderPaidNotifications } from "@/lib/notifications/order-events";
import { getOrderRepository, getPaymentGateway } from "@/services/payment-factory";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Confirms an order against the payment provider and, if paid, runs the
 * post-payment side effects exactly once: grant the buyer access. Creator
 * repasses are manual — the creator withdraws from the dashboard when ready.
 *
 * This is intentionally idempotent and safe to call from BOTH the webhook and
 * the buyer's status poll — the `pending -> paid` transition is atomic. It
 * never trusts the caller's word that a payment happened; it always re-checks
 * the charge status with the gateway before granting anything.
 */
export async function finalizeOrder(orderId: string): Promise<Order | null> {
  const orders = getOrderRepository();
  const gateway = getPaymentGateway();

  const order = await orders.getById(orderId);
  if (!order) return null;

  if (order.status !== "pending") return order;
  if (!order.abacateChargeId) return order;

  const status = await gateway.getPixChargeStatus(order.abacateChargeId);

  if (status === "expired" || status === "cancelled") {
    return orders.update(orderId, { status: "expired" });
  }
  if (status === "refunded") {
    return orders.update(orderId, { status: "refunded" });
  }
  if (status !== "paid") {
    return order;
  }

  const paidOrder = await orders.transitionToPaid(orderId);
  if (!paidOrder) return orders.getById(orderId);

  await grantAccess(paidOrder);
  await sendOrderPaidNotifications(paidOrder);
  return paidOrder;
}

/** Grants the buyer an entitlement row. Idempotent via the unique constraint. */
async function grantAccess(order: Order): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("product_accesses").upsert(
    {
      user_id: order.buyerId,
      product_id: order.productId,
      source: "purchase",
    },
    { onConflict: "user_id,product_id", ignoreDuplicates: true }
  );
  if (error) {
    throw new Error(`Falha ao conceder acesso ao produto: ${error.message}`);
  }
}
