/**
 * Backend-agnostic shipping gateway (freight quote, label purchase/printing,
 * tracking). Implementations wrap a concrete platform (currently Melhor Envio).
 * Money in integer cents, weights in grams, dimensions in centimeters.
 */

import type {
  ShipFromAddress,
  ShippingAddress,
  ShippingPackage,
  ShippingQuoteOption,
} from "../models/shipping";

export interface ShippingQuoteInput {
  fromPostalCode: string;
  toPostalCode: string;
  package: ShippingPackage;
  insuranceValueCents: number;
  /** Restrict to these service ids (allowlist). Empty = all. */
  serviceIds?: number[];
}

export interface ShippingDeclaredItem {
  name: string;
  quantity: number;
  unitaryValueCents: number;
}

export interface AddShipmentToCartInput {
  serviceId: number;
  from: ShipFromAddress;
  to: ShippingAddress;
  items: ShippingDeclaredItem[];
  package: ShippingPackage;
  insuranceValueCents: number;
  /** NF-e key (commercial shipment). Omit for DC-e (non-commercial). */
  invoiceKey?: string;
  /** Our order id, echoed back by the platform (tags/reminder). */
  externalId: string;
  externalUrl?: string | null;
  reminder?: string;
}

export interface CartShipment {
  /** Label id on the platform. */
  id: string;
  protocol?: string;
  priceCents: number;
}

export interface ShipmentTrackingInfo {
  id: string;
  /** Raw platform status (e.g. "posted", "delivered"). */
  status: string;
  trackingCode?: string;
  trackingUrl?: string;
  postedAt?: Date;
  deliveredAt?: Date;
  canceledAt?: Date;
  expiredAt?: Date;
}

export type ShippingGatewayErrorCode =
  | "insufficient_balance"
  | "label_limit"
  | "invalid_data"
  | "not_cancellable"
  | "unavailable"
  | "not_configured"
  | "unknown";

export class ShippingGatewayError extends Error {
  constructor(
    readonly code: ShippingGatewayErrorCode,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ShippingGatewayError";
  }
}

export interface ShippingGateway {
  quote(input: ShippingQuoteInput): Promise<ShippingQuoteOption[]>;
  addToCart(input: AddShipmentToCartInput): Promise<CartShipment>;
  removeFromCart(labelId: string): Promise<void>;
  /** Pays the labels with the platform wallet balance. */
  checkout(labelIds: string[]): Promise<void>;
  generate(labelIds: string[]): Promise<void>;
  /** Returns a URL to the PDF with the labels. */
  print(labelIds: string[]): Promise<string>;
  getTracking(labelIds: string[]): Promise<Record<string, ShipmentTrackingInfo>>;
  /** Cancels a label (credit returns to the wallet). */
  cancel(labelId: string, description: string): Promise<void>;
  getBalanceCents(): Promise<number>;
}
