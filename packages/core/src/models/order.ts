/**
 * Domain model for a product purchase (order) paid via PIX.
 *
 * Backend-agnostic (camelCase, no Supabase/AbacatePay types). Money is always
 * stored in integer cents. An order captures both the charge to the buyer and
 * the split between the platform (our fee) and the creator (the repass).
 */

import type { ShippingMode } from "./product";
import type { ShippingAddress, ShippingQuoteSnapshot } from "./shipping";

// Lifecycle of the charge on our side.
export type OrderStatus =
  | "pending"
  | "paid"
  | "expired"
  | "refunded"
  | "failed";

// Repass of the creator's share via a third-party PIX transfer.
// `held`: physical order in escrow (not withdrawable until delivered).
// `refunded`: the buyer was refunded, nothing goes to the creator.
export type TransferStatus = "pending" | "sent" | "failed" | "held" | "refunded";

/**
 * Business/escrow state of a physical order (`none` for digital products).
 * Transitions live in `@vippin/core/domain/fulfillment`.
 */
export type FulfillmentStatus =
  | "none"
  | "awaiting_shipment"
  | "label_ready"
  | "posted"
  | "in_transit"
  | "delivered"
  | "released"
  | "refund_pending"
  | "refunded";

export interface Order {
  id: string;
  productId: string;
  buyerId: string;
  creatorId: string;
  // Full price charged to the buyer (product + freight when the buyer pays it).
  amountCents: number;
  // Our cut (see NEXT_PUBLIC_PLATFORM_FEE_PERCENT; AbacatePay fees absorbed by platform).
  platformFeeCents: number;
  // The creator's cut, repassed via manual withdraw or weekly batch.
  creatorAmountCents: number;
  status: OrderStatus;
  // AbacatePay transparent PIX charge (QR code) reference and artifacts.
  abacateChargeId?: string;
  brCode?: string;
  brCodeBase64?: string;
  expiresAt?: Date;
  paidAt?: Date;
  // Creator repass tracking.
  transferStatus: TransferStatus;
  abacateTransferId?: string;
  transferError?: string;
  // Physical products: freight and escrow.
  shippingMode?: ShippingMode;
  shippingQuote?: ShippingQuoteSnapshot;
  /** Freight paid by the buyer (added to the PIX). */
  shippingChargedCents: number;
  /** Freight absorbed by the creator (free shipping). */
  shippingAbsorbedCents: number;
  /** Real cost paid to the carrier platform (set when the label is bought). */
  shippingCostCents?: number;
  shipTo?: ShippingAddress;
  fulfillmentStatus: FulfillmentStatus;
  prepareDeadlineAt?: Date;
  postDeadlineAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  /** Admin hold: escrow jobs skip automatic release while set. */
  adminHoldAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
