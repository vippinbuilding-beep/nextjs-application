/**
 * Escrow/fulfillment state machine for physical orders — the single source of
 * truth for `Order.fulfillmentStatus` transitions. Every writer (payment
 * finalize, label preparation, tracking sync, escrow jobs, admin overrides)
 * must go through `nextFulfillment` so they never diverge.
 *
 *   awaiting_shipment ─label_ready→ label_ready ─posted→ posted ─delivered→ delivered ─release→ released
 *          │                          │  ↑label_canceled           │ (auto-release)
 *          └──────refund_requested────┴─────────────────────────────┴──→ refund_pending ─refunded→ refunded
 */

import type { FulfillmentStatus } from "../models/order";
import type { ShipmentStatus } from "../models/shipment";

export type FulfillmentEvent =
  | "paid"
  | "label_ready"
  | "label_canceled"
  | "posted"
  | "in_transit"
  | "delivered"
  | "release"
  | "hold"
  | "refund_requested"
  | "refunded";

const TRANSITIONS: Record<
  FulfillmentStatus,
  Partial<Record<FulfillmentEvent, FulfillmentStatus>>
> = {
  none: { paid: "awaiting_shipment" },
  awaiting_shipment: {
    label_ready: "label_ready",
    refund_requested: "refund_pending",
  },
  label_ready: {
    label_canceled: "awaiting_shipment",
    posted: "posted",
    in_transit: "in_transit",
    delivered: "delivered",
    refund_requested: "refund_pending",
  },
  posted: {
    in_transit: "in_transit",
    delivered: "delivered",
    release: "released",
    refund_requested: "refund_pending",
  },
  in_transit: {
    delivered: "delivered",
    release: "released",
    refund_requested: "refund_pending",
  },
  delivered: {
    release: "released",
    refund_requested: "refund_pending",
  },
  // Admin "reter": only meaningful before the creator withdraws.
  released: { hold: "delivered" },
  refund_pending: { refunded: "refunded" },
  refunded: {},
};

export class InvalidFulfillmentTransition extends Error {
  constructor(
    readonly from: FulfillmentStatus,
    readonly event: FulfillmentEvent
  ) {
    super(`Transição inválida: ${from} --${event}-->`);
    this.name = "InvalidFulfillmentTransition";
  }
}

export function canTransition(
  from: FulfillmentStatus,
  event: FulfillmentEvent
): boolean {
  return Boolean(TRANSITIONS[from][event]);
}

/** Returns the next state or throws {@link InvalidFulfillmentTransition}. */
export function nextFulfillment(
  from: FulfillmentStatus,
  event: FulfillmentEvent
): FulfillmentStatus {
  const to = TRANSITIONS[from][event];
  if (!to) throw new InvalidFulfillmentTransition(from, event);
  return to;
}

/** States from which `event` is allowed (for atomic `WHERE status IN (...)`). */
export function statesAllowing(event: FulfillmentEvent): FulfillmentStatus[] {
  return (Object.keys(TRANSITIONS) as FulfillmentStatus[]).filter((from) =>
    canTransition(from, event)
  );
}

export function isTerminalFulfillment(status: FulfillmentStatus): boolean {
  return status === "released" || status === "refunded" || status === "none";
}

/** Escrow still holds the creator's share in these states. */
export function isHeldFulfillment(status: FulfillmentStatus): boolean {
  return (
    status === "awaiting_shipment" ||
    status === "label_ready" ||
    status === "posted" ||
    status === "in_transit" ||
    status === "delivered"
  );
}

/**
 * Maps a carrier platform status (Melhor Envio: pending, released, generated,
 * received, posted, delivered, canceled/cancelled, undelivered, paused,
 * suspended, expired) to our shipment status. Unknown → null (ignore).
 */
export function mapProviderShipmentStatus(
  providerStatus: string | null | undefined
): ShipmentStatus | null {
  switch ((providerStatus ?? "").toLowerCase()) {
    case "posted":
    case "received":
      return "posted";
    case "delivered":
      return "delivered";
    case "canceled":
    case "cancelled":
    case "expired":
      return "canceled";
    case "undelivered":
      return "returned";
    default:
      return null;
  }
}

/** Fulfillment event implied by a shipment status change. */
export function fulfillmentEventForShipment(
  status: ShipmentStatus
): FulfillmentEvent | null {
  switch (status) {
    case "posted":
      return "posted";
    case "delivered":
      return "delivered";
    case "canceled":
      return "label_canceled";
    default:
      return null;
  }
}

export interface EscrowConfig {
  prepareDeadlineDays: number;
  postDeadlineDays: number;
  autoReleaseMinDays: number;
  autoReleaseExtraDays: number;
  disputeBufferDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function prepareDeadline(paidAt: Date, config: EscrowConfig): Date {
  return addDays(paidAt, config.prepareDeadlineDays);
}

export function postDeadline(labelPrintedAt: Date, config: EscrowConfig): Date {
  return addDays(labelPrintedAt, config.postDeadlineDays);
}

/** Safety net when tracking never reports delivery. */
export function autoReleaseAt(
  postedAt: Date,
  deliveryDays: number | undefined,
  config: EscrowConfig
): Date {
  const days = Math.max(
    config.autoReleaseMinDays,
    (deliveryDays ?? 0) + config.autoReleaseExtraDays
  );
  return addDays(postedAt, days);
}

export function releaseAfterDelivery(deliveredAt: Date, config: EscrowConfig): Date {
  return addDays(deliveredAt, config.disputeBufferDays);
}

/** pt-BR labels for UI. */
export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  none: "—",
  awaiting_shipment: "Aguardando envio",
  label_ready: "Etiqueta pronta",
  posted: "Postado",
  in_transit: "Em trânsito",
  delivered: "Entregue",
  released: "Concluído",
  refund_pending: "Reembolsando",
  refunded: "Reembolsado",
};
