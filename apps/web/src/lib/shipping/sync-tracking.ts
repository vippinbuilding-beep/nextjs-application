import "server-only";

import {
  canTransition,
  mapProviderShipmentStatus,
} from "@vippin/core/domain/fulfillment";
import type { Shipment } from "@vippin/core/models/shipment";
import type { ShipmentTrackingInfo } from "@vippin/core/shipping/shipping-gateway";
import {
  notifyShipmentDelivered,
  notifyShipmentPosted,
  notifyShipmentProblem,
} from "@/lib/notifications/shipping-events";
import { applyFulfillmentEvent, refundPhysicalOrder } from "@/lib/payments/escrow";
import { getOrderRepository } from "@vippin/supabase/factories/payment-factory";
import {
  getShipmentRepository,
  getShippingGateway,
} from "@vippin/supabase/factories/shipping-factory";

const CHUNK = 20;

/**
 * Applies a carrier status update (from polling or webhook) to the shipment
 * and the order's escrow state. Idempotent: repeated updates are no-ops.
 */
export async function applyTrackingUpdate(
  shipment: Shipment,
  info: ShipmentTrackingInfo
): Promise<void> {
  const shipments = getShipmentRepository();
  const orders = getOrderRepository();
  const mapped = mapProviderShipmentStatus(info.status);
  const now = new Date();

  await shipments.update(shipment.id, {
    lastTrackingSyncAt: now,
    ...(info.trackingCode ? { trackingCode: info.trackingCode } : {}),
    ...(info.trackingUrl ? { trackingUrl: info.trackingUrl } : {}),
  });

  if (!mapped || mapped === shipment.status) return;
  const order = await orders.getById(shipment.orderId);
  if (!order) return;

  switch (mapped) {
    case "posted": {
      if (!["purchased", "printed"].includes(shipment.status)) return;
      await shipments.update(shipment.id, { status: "posted", postedAt: info.postedAt ?? now });
      if (canTransition(order.fulfillmentStatus, "posted")) {
        const updated = await applyFulfillmentEvent(order, "posted");
        if (updated) await notifyShipmentPosted(updated, info.trackingCode ?? shipment.trackingCode);
      }
      return;
    }
    case "delivered": {
      if (shipment.status === "delivered") return;
      await shipments.update(shipment.id, {
        status: "delivered",
        postedAt: shipment.postedAt ?? info.postedAt ?? now,
        deliveredAt: info.deliveredAt ?? now,
      });
      if (canTransition(order.fulfillmentStatus, "delivered")) {
        const updated = await applyFulfillmentEvent(order, "delivered");
        if (updated) await notifyShipmentDelivered(updated);
      }
      return;
    }
    case "canceled": {
      // Canceled/expired on the platform side before posting.
      if (!["purchased", "printed"].includes(shipment.status)) return;
      await shipments.update(shipment.id, {
        status: "canceled",
        canceledAt: info.canceledAt ?? info.expiredAt ?? now,
        providerOrderId: null,
      });
      if (canTransition(order.fulfillmentStatus, "label_canceled")) {
        await applyFulfillmentEvent(order, "label_canceled", {
          shippingCostCents: null,
          postDeadlineAt: null,
        });
        await notifyShipmentProblem(
          order,
          "a etiqueta foi cancelada ou venceu na transportadora. Prepare o envio de novo dentro do prazo."
        );
      }
      return;
    }
    case "returned": {
      await shipments.update(shipment.id, { status: "returned" });
      await notifyShipmentProblem(order, "a transportadora não conseguiu entregar e o pacote volta para você.");
      await refundPhysicalOrder(order.id, "returned");
      return;
    }
    default:
      return;
  }
}

export interface ShippingSyncSummary {
  checked: number;
  failed: number;
}

/** Polls the carrier for every label still in transit (oldest sync first). */
export async function runShippingSync(limit = 200): Promise<ShippingSyncSummary> {
  const shipments = getShipmentRepository();
  const gateway = getShippingGateway();
  const pending = await shipments.listForTrackingSync(limit);
  const summary: ShippingSyncSummary = { checked: 0, failed: 0 };

  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK);
    const ids = chunk.map((s) => s.providerOrderId!).filter(Boolean);
    try {
      const tracking = await gateway.getTracking(ids);
      for (const shipment of chunk) {
        const info = tracking[shipment.providerOrderId!];
        if (!info) continue;
        summary.checked += 1;
        await applyTrackingUpdate(shipment, info);
      }
    } catch (err) {
      summary.failed += chunk.length;
      console.error("[shipping] tracking sync failed:", err instanceof Error ? err.message : err);
    }
  }
  return summary;
}
