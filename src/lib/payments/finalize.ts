import "server-only";

import type { Order } from "@/core/models/order";
import type { PixKeyType } from "@/core/models/user";
import { getOrderRepository, getPaymentGateway } from "@/services/payment-factory";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// AbacatePay `/pix/send` minimum transfer amount (R$ 1,00).
const MIN_TRANSFER_CENTS = 100;

/**
 * Confirms an order against the payment provider and, if paid, runs the
 * post-payment side effects exactly once: grant the buyer access and repass the
 * creator's 90% via PIX.
 *
 * This is intentionally idempotent and safe to call from BOTH the webhook and
 * the buyer's status poll — the `pending -> paid` transition is atomic, so only
 * the first caller triggers the grant + repass. It never trusts the caller's
 * word that a payment happened; it always re-checks the charge status with the
 * gateway before granting anything.
 */
export async function finalizeOrder(orderId: string): Promise<Order | null> {
  const orders = getOrderRepository();
  const gateway = getPaymentGateway();

  const order = await orders.getById(orderId);
  if (!order) return null;

  // Already resolved — nothing to do (repass is handled by the transition
  // winner; failed repasses are retried through a separate manual path).
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

  // Payment confirmed by the provider. Claim the transition; if we don't win it,
  // another call already handled the side effects.
  const paidOrder = await orders.transitionToPaid(orderId);
  if (!paidOrder) return orders.getById(orderId);

  await grantAccess(paidOrder);
  return repassToCreator(paidOrder);
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
    // Access is the buyer's entitlement — surface failures loudly so they can be
    // reconciled; the payment already went through.
    throw new Error(`Falha ao conceder acesso ao produto: ${error.message}`);
  }
}

/** Retries the creator repass for a paid order (used by the transfer retry worker). */
export async function repassOrderToCreator(
  orderId: string
): Promise<Order | null> {
  const orders = getOrderRepository();
  const order = await orders.getById(orderId);
  if (!order) return null;
  if (order.status !== "paid") return order;
  if (order.transferStatus === "sent") return order;
  return repassToCreator(order);
}

/**
 * Sends the creator's 90% to their registered PIX key. Failures here never block
 * the buyer's access: we record `transfer_status = 'failed'` for manual retry.
 */
async function repassToCreator(order: Order): Promise<Order> {
  const orders = getOrderRepository();
  const gateway = getPaymentGateway();

  const fail = (message: string) =>
    orders.update(order.id, {
      transferStatus: "failed",
      transferError: message,
    });

  if (order.creatorAmountCents < MIN_TRANSFER_CENTS) {
    return (
      (await fail("Valor do repasse abaixo do mínimo de R$ 1,00.")) ?? order
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("pix_key, pix_key_type")
    .eq("id", order.creatorId)
    .maybeSingle();

  if (error) return (await fail(error.message)) ?? order;
  if (!profile?.pix_key || !profile.pix_key_type) {
    return (await fail("Criador sem chave PIX cadastrada.")) ?? order;
  }

  try {
    const transfer = await gateway.sendPix({
      amountCents: order.creatorAmountCents,
      externalId: `order-${order.id}`,
      description: "Repasse Vippin",
      pixKey: profile.pix_key,
      pixKeyType: profile.pix_key_type.toUpperCase() as PixKeyType,
    });

    return (
      (await orders.update(order.id, {
        transferStatus: "sent",
        abacateTransferId: transfer.id,
        transferError: null,
      })) ?? order
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no repasse PIX.";
    return (await fail(message)) ?? order;
  }
}
