import type { PixKeyType } from "@/core/models/user";

/**
 * Backend-agnostic payment gateway abstraction.
 *
 * Implementations wrap a concrete payment provider (currently AbacatePay). The
 * app talks only to this interface, so swapping providers later is contained to
 * a single adapter. All amounts are in integer cents.
 */

export type PixChargeStatus =
  | "pending"
  | "paid"
  | "expired"
  | "cancelled"
  | "refunded";

export type PixTransferStatus =
  | "pending"
  | "complete"
  | "expired"
  | "cancelled"
  | "refunded";

export interface CreatePixChargeInput {
  amountCents: number;
  description?: string;
  /** Seconds until the PIX QR code expires. */
  expiresInSeconds?: number;
  /** Buyer info shown on the payment; all fields required together by the API. */
  customer?: {
    name: string;
    email: string;
    taxId: string;
    cellphone: string;
  };
  /** Arbitrary reference data echoed back on webhooks. */
  metadata?: Record<string, string>;
}

export interface PixCharge {
  id: string;
  status: PixChargeStatus;
  amountCents: number;
  /** Copy-and-paste PIX string. */
  brCode: string;
  /** PNG (data URI) of the QR code. */
  brCodeBase64: string;
  expiresAt?: Date;
}

export interface SendPixInput {
  amountCents: number;
  /** Unique id in our system; also used for idempotency at the provider. */
  externalId: string;
  description?: string;
  pixKey: string;
  pixKeyType: PixKeyType;
}

export interface PixTransfer {
  id: string;
  status: PixTransferStatus;
  amountCents: number;
}

export interface RefundPixChargeInput {
  chargeId: string;
  reason?: string;
}

export interface PixRefund {
  id: string;
}

export interface PaymentGateway {
  /** Opens a transparent PIX charge (QR code) for the buyer to pay. */
  createPixCharge(input: CreatePixChargeInput): Promise<PixCharge>;
  /** Fetches the current status of a PIX charge by its id. */
  getPixChargeStatus(chargeId: string): Promise<PixChargeStatus>;
  /**
   * Refunds a paid transparent PIX charge back to the original payer.
   * Only full refunds are supported.
   */
  refundPixCharge(input: RefundPixChargeInput): Promise<PixRefund>;
  /** Sends a PIX transfer to a third-party key (the creator's repass). */
  sendPix(input: SendPixInput): Promise<PixTransfer>;
  /**
   * Simulates paying a PIX charge. Only works with dev-mode API keys; used in
   * tests/sandbox. Throws in production.
   */
  simulatePixPayment(chargeId: string): Promise<void>;
}
