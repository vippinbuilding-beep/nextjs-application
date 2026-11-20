import "server-only";

import {
  addDays,
  autoReleaseAt,
  nextFulfillment,
  prepareDeadline,
  releaseAfterDelivery,
  statesAllowing,
  type FulfillmentEvent,
} from "@vippin/core/domain/fulfillment";
import type { FulfillmentStatus, Order } from "@vippin/core/models/order";
import type { UpdateOrderInput } from "@vippin/core/repositories/order-repository";
import { ShippingGatewayError } from "@vippin/core/shipping/shipping-gateway";
import {
  notifyOrderRefunded,
  notifyOrderReleased,
  notifyPhysicalOrderPaid,
  notifyShipmentDeadlineSoon,
  notifyShipmentProblem,
  type RefundReason,
} from "@/lib/notifications/shipping-events";
import { ESCROW_CONFIG } from "@/lib/shipping/config";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { getOrderRepository, getPaymentGateway } from "@vippin/supabase/factories/payment-factory";
import {
  getShipmentRepository,
  getShippingGateway,
} from "@vippin/supabase/factories/shipping-factory";

export type EscrowActor = { kind: "system" } | { kind: "creator" | "admin"; userId: string };

const SYSTEM: EscrowActor = { kind: "system" };
const BATCH_LIMIT = 200;

export async function logFulfillmentEvent(
  orderId: string,
  from: FulfillmentStatus,
  to: FulfillmentStatus,
  actor: EscrowActor,
  note?: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("fulfillment_events").insert({
    order_id: orderId,
    from_status: from,
    to_status: to,
    actor: actor.kind,
    actor_id: actor.kind === "system" ? null : actor.userId,
    note: note?.slice(0, 500) ?? null,
  });
  if (error) console.error("[escrow] failed to log event:", error.message);
}

/**
 * Applies `event` atomically (WHERE fulfillment_status IN allowed states) and
 * logs it. Returns the updated order only when THIS call won the transition.
 */
export async function applyFulfillmentEvent(
  order: Order,
  event: FulfillmentEvent,
  patch: Omit<UpdateOrderInput, "fulfillmentStatus"> = {},
  actor: EscrowActor = SYSTEM,
  note?: string
): Promise<Order | null> {
  const to = nextFulfillment(order.fulfillmentStatus, event);
  const updated = await getOrderRepository().transitionFulfillment(
    order.id,
    [order.fulfillmentStatus],
    to,
    patch
  );
  if (updated) await logFulfillmentEvent(order.id, order.fulfillmentStatus, to, actor, note);
  return updated;
}

export async function recordShippingAdjustment(input: {
  order: Order;
  kind: "price_divergence" | "carrier_divergence" | "package_change" | "return_cost";
  amountCents: number;
  chargedTo: "platform" | "creator";
  note?: string;
  createdBy?: string;
}): Promise<void> {
  if (!input.amountCents) return;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("shipping_adjustments").insert({
    order_id: input.order.id,
    creator_id: input.order.creatorId,
    kind: input.kind,
    amount_cents: input.amountCents,
    charged_to: input.chargedTo,
    note: input.note?.slice(0, 500) ?? null,
    created_by: input.createdBy ?? null,
  });
  if (error) console.error("[escrow] failed to record adjustment:", error.message);
}

// ── Payment confirmed ───────────────────────────────────────────────────────

/**
 * Post-payment side effects of a physical order (called once, right after the
 * atomic pending→paid flip in `finalizeOrder`; the escrow jobs also recover
 * orders that crashed in between). Enters escrow, reserves stock, creates the
 * pending shipment and notifies both sides. Never calls the carrier: the label
 * is bought when the creator prepares the shipment.
 */
export async function onPhysicalOrderPaid(order: Order): Promise<Order | null> {
  const paidAt = order.paidAt ?? new Date();
  const entered = await applyFulfillmentEvent(order, "paid", {
    transferStatus: "held",
    prepareDeadlineAt: prepareDeadline(paidAt, ESCROW_CONFIG),
  });
  if (!entered) return getOrderRepository().getById(order.id);

  const admin = createSupabaseAdminClient();
  const { data: reserved, error } = await admin.rpc("decrement_product_stock", {
    p_product_id: order.productId,
  });
  if (error || reserved !== true) {
    // Sold out in a race (two pending PIX for the last unit): refund this one.
    await refundPhysicalOrder(entered.id, "out_of_stock");
    return getOrderRepository().getById(order.id);
  }

  const { data: product } = await admin
    .from("products")
    .select("weight_grams, length_cm, width_cm, height_cm")
    .eq("id", order.productId)
    .maybeSingle();

  await getShipmentRepository().createForOrder({
    orderId: entered.id,
    creatorId: entered.creatorId,
    buyerId: entered.buyerId,
    serviceId: entered.shippingQuote?.serviceId,
    company: entered.shippingQuote?.company,
    package: product
      ? {
          weightGrams: product.weight_grams ?? 0,
          lengthCm: product.length_cm ?? 0,
          widthCm: product.width_cm ?? 0,
          heightCm: product.height_cm ?? 0,
        }
      : undefined,
  });

  await notifyPhysicalOrderPaid(entered);
  return entered;
}

// ── Release ─────────────────────────────────────────────────────────────────

/** Releases the creator's share (escrow → withdrawable). Idempotent. */
export async function releaseOrder(
  orderId: string,
  actor: EscrowActor = SYSTEM,
  note?: string
): Promise<Order | null> {
  const order = await getOrderRepository().getById(orderId);
  if (!order || order.status !== "paid") return null;
  if (!statesAllowing("release").includes(order.fulfillmentStatus)) return null;
  // An admin hold blocks every automatic release; only an admin lifts it.
  if (order.adminHoldAt && actor.kind !== "admin") return null;

  const released = await applyFulfillmentEvent(
    order,
    "release",
    { transferStatus: "pending", releasedAt: new Date(), adminHoldAt: null },
    actor,
    note
  );
  if (released) await notifyOrderReleased(released);
  return released;
}

/**
 * Admin "reter": blocks automatic release (sticky `admin_hold_at`). On an order
 * already released it moves the share back into escrow — only if the creator
 * hasn't withdrawn it yet (transfer still pending). Lifted by an admin release.
 */
export async function holdOrder(
  orderId: string,
  actor: EscrowActor,
  note?: string
): Promise<Order | null> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: back, error } = await admin
    .from("orders")
    .update({
      fulfillment_status: "delivered",
      transfer_status: "held",
      released_at: null,
      admin_hold_at: now,
    })
    .eq("id", orderId)
    .eq("fulfillment_status", "released")
    .eq("transfer_status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (back) {
    await logFulfillmentEvent(orderId, "released", "delivered", actor, note ?? "retido pelo admin");
    return getOrderRepository().getById(orderId);
  }

  const { data: held, error: holdError } = await admin
    .from("orders")
    .update({ admin_hold_at: now })
    .eq("id", orderId)
    .in("fulfillment_status", ["awaiting_shipment", "label_ready", "posted", "in_transit", "delivered"])
    .is("admin_hold_at", null)
    .select("id, fulfillment_status")
    .maybeSingle();
  if (holdError) throw new Error(holdError.message);
  if (!held) return null;
  const status = held.fulfillment_status as FulfillmentStatus;
  await logFulfillmentEvent(orderId, status, status, actor, note ?? "retido pelo admin");
  return getOrderRepository().getById(orderId);
}

// ── Refund ──────────────────────────────────────────────────────────────────

/**
 * Refunds a physical order to the buyer (PIX charge refund: price + freight
 * when the buyer paid it). Cancels the label when it wasn't posted yet (the
 * credit returns to the Melhor Carteira) and gives the unit back to stock.
 * Two-phase and idempotent: refund_pending is the claim; a failed PIX refund
 * stays there and is retried by the escrow jobs.
 */
export async function refundPhysicalOrder(
  orderId: string,
  reason: RefundReason,
  actor: EscrowActor = SYSTEM,
  note?: string
): Promise<Order | null> {
  const orders = getOrderRepository();
  let order = await orders.getById(orderId);
  if (!order || order.status !== "paid") return order;

  let claimedNow = false;
  if (order.fulfillmentStatus !== "refund_pending") {
    if (!statesAllowing("refund_requested").includes(order.fulfillmentStatus)) return order;
    const claimed = await applyFulfillmentEvent(
      order,
      "refund_requested",
      { transferError: reason },
      actor,
      note ?? reason
    );
    if (!claimed) return orders.getById(orderId);
    order = claimed;
    claimedNow = true;
  }

  const refundReason = (order.transferError as RefundReason | undefined) ?? reason;
  const shipments = getShipmentRepository();
  const shipment = await shipments.getByOrderId(order.id);
  // Posted/returned packages don't come back to stock automatically.
  const restock = !shipment || !["posted", "delivered", "returned"].includes(shipment.status);

  if (!claimedNow) {
    // Retry of a failed PIX refund: label handling already happened.
  } else if (shipment?.providerOrderId && ["purchased", "printed", "purchasing"].includes(shipment.status)) {
    try {
      await getShippingGateway().cancel(
        shipment.providerOrderId,
        `Pedido ${order.id.slice(0, 8)} reembolsado ao comprador`
      );
      await shipments.update(shipment.id, { status: "canceled", canceledAt: new Date() });
    } catch (err) {
      // Label may have been posted meanwhile — keep going with the refund and
      // flag it for the admin (the freight cost is absorbed by the platform).
      const message = err instanceof Error ? err.message : "Falha ao cancelar etiqueta.";
      await shipments.update(shipment.id, { error: message });
      if (shipment.costCents) {
        await recordShippingAdjustment({
          order,
          kind: "return_cost",
          amountCents: shipment.costCents,
          chargedTo: "platform",
          note: `Etiqueta não cancelada no reembolso: ${message}`,
        });
      }
    }
  } else if (shipment && (shipment.status === "posted" || shipment.status === "returned")) {
    if (shipment.costCents) {
      await recordShippingAdjustment({
        order,
        kind: "return_cost",
        amountCents: shipment.costCents,
        chargedTo: "platform",
        note: "Frete perdido em devolução/reembolso após postagem.",
      });
    }
  }

  if (!order.abacateChargeId) {
    await orders.update(order.id, { transferError: "Cobrança PIX ausente para estorno." });
    return orders.getById(order.id);
  }

  try {
    const refund = await getPaymentGateway().refundPixCharge({
      chargeId: order.abacateChargeId,
      reason: "Pedido de produto físico reembolsado — Vippin",
    });
    const refunded = await orders.transitionFulfillment(order.id, ["refund_pending"], "refunded", {
      status: "refunded",
      transferStatus: "refunded",
      abacateTransferId: refund.id,
      transferError: null,
      refundedAt: new Date(),
    });
    if (!refunded) return orders.getById(order.id);
    await logFulfillmentEvent(order.id, "refund_pending", "refunded", SYSTEM, refundReason);

    if (restock && refundReason !== "out_of_stock") {
      const admin = createSupabaseAdminClient();
      await admin.rpc("increment_product_stock", { p_product_id: order.productId });
    }
    await notifyOrderRefunded(refunded, refundReason);
    return refunded;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no estorno PIX.";
    console.error("[escrow] refund failed:", order.id, message);
    // Keep the reason in transferError so the retry knows why; the PIX error
    // goes to the logs (and the admin dashboard shows refund_pending orders).
    return orders.getById(order.id);
  }
}

// ── Scheduled jobs ──────────────────────────────────────────────────────────

export interface EscrowJobsSummary {
  recovered: number;
  released: number;
  autoReleased: number;
  refundedUnprepared: number;
  refundedUnposted: number;
  refundRetries: number;
  reminders: number;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Runs every escrow rule once. Safe to call repeatedly (every step is an
 * atomic, conditional transition). Called by the daily cron after the
 * tracking sync, and by `/api/cron/shipping-sync`.
 */
export async function runEscrowJobs(now = new Date()): Promise<EscrowJobsSummary> {
  const orders = getOrderRepository();
  const shipments = getShipmentRepository();
  const summary: EscrowJobsSummary = {
    recovered: 0,
    released: 0,
    autoReleased: 0,
    refundedUnprepared: 0,
    refundedUnposted: 0,
    refundRetries: 0,
    reminders: 0,
  };

  // 0) Physical orders paid but never entered escrow (crash between steps).
  const admin = createSupabaseAdminClient();
  const { data: orphanRows } = await admin
    .from("orders")
    .select("id")
    .eq("status", "paid")
    .eq("fulfillment_status", "none")
    .not("shipping_mode", "is", null)
    .limit(BATCH_LIMIT);
  for (const row of (orphanRows ?? []) as { id: string }[]) {
    const order = await orders.getById(row.id);
    if (order && (await onPhysicalOrderPaid(order))) summary.recovered += 1;
  }

  const active = await orders.listByFulfillmentStatus(
    ["awaiting_shipment", "label_ready", "posted", "in_transit", "delivered", "refund_pending"],
    BATCH_LIMIT
  );
  const shipmentByOrder = new Map(
    (await shipments.listByOrderIds(active.map((o) => o.id))).map((s) => [s.orderId, s])
  );

  for (const order of active) {
    const shipment = shipmentByOrder.get(order.id);
    try {
      switch (order.fulfillmentStatus) {
        case "awaiting_shipment": {
          const deadline = order.prepareDeadlineAt;
          if (deadline && deadline <= now) {
            const result = await refundPhysicalOrder(order.id, "not_prepared");
            if (result?.fulfillmentStatus === "refunded") summary.refundedUnprepared += 1;
          } else if (deadline && deadline.getTime() - now.getTime() <= 24 * HOUR_MS) {
            await notifyShipmentDeadlineSoon(order, "prepare");
            summary.reminders += 1;
          }
          break;
        }
        case "label_ready": {
          const deadline = order.postDeadlineAt;
          // 24h grace: carriers can take ~1 business day to report a posting
          // (the tracking sync runs right before these jobs).
          if (deadline && deadline.getTime() + 24 * HOUR_MS <= now.getTime()) {
            const result = await refundPhysicalOrder(order.id, "not_posted");
            if (result?.fulfillmentStatus === "refunded") summary.refundedUnposted += 1;
          } else if (deadline && deadline.getTime() - now.getTime() <= 24 * HOUR_MS) {
            await notifyShipmentDeadlineSoon(order, "post");
            summary.reminders += 1;
          }
          break;
        }
        case "posted":
        case "in_transit": {
          if (order.adminHoldAt) break;
          const postedAt = shipment?.postedAt;
          if (postedAt && autoReleaseAt(postedAt, order.shippingQuote?.deliveryDays, ESCROW_CONFIG) <= now) {
            const released = await releaseOrder(order.id, SYSTEM, "auto-release: rastreio sem entrega");
            if (released) {
              summary.autoReleased += 1;
              await notifyShipmentProblem(
                released,
                "o rastreio não confirmou a entrega no prazo; o valor foi liberado automaticamente."
              );
            }
          }
          break;
        }
        case "delivered": {
          if (order.adminHoldAt) break;
          const deliveredAt = shipment?.deliveredAt ?? order.updatedAt;
          if (releaseAfterDelivery(deliveredAt, ESCROW_CONFIG) <= now) {
            if (await releaseOrder(order.id)) summary.released += 1;
          }
          break;
        }
        case "refund_pending": {
          // Retry failed PIX refunds after a short cool-down.
          if (order.updatedAt <= addDays(now, -1 / 288)) {
            summary.refundRetries += 1;
            await refundPhysicalOrder(order.id, (order.transferError as RefundReason) ?? "admin");
          }
          break;
        }
      }
    } catch (err) {
      const message =
        err instanceof ShippingGatewayError || err instanceof Error ? err.message : String(err);
      console.error("[escrow] job failed for order", order.id, message);
    }
  }

  return summary;
}
