/**
 * Domain model for a product purchase (order) paid via PIX.
 *
 * Backend-agnostic (camelCase, no Supabase/AbacatePay types). Money is always
 * stored in integer cents. An order captures both the charge to the buyer and
 * the split between the platform (our fee) and the creator (the repass).
 */

// Lifecycle of the charge on our side.
export type OrderStatus =
  | "pending"
  | "paid"
  | "expired"
  | "refunded"
  | "failed";

// Repass of the creator's share via a third-party PIX transfer.
export type TransferStatus = "pending" | "sent" | "failed";

export interface Order {
  id: string;
  productId: string;
  buyerId: string;
  creatorId: string;
  // Full price charged to the buyer.
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
  createdAt: Date;
  updatedAt: Date;
}
