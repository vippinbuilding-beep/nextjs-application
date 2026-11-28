/**
 * A shipment (label) for a physical order. `status` mirrors the carrier
 * platform side; the business/escrow state lives on `Order.fulfillmentStatus`.
 */

import type { ShippingPackage } from "./shipping";

export type ShipmentStatus =
  | "pending"
  | "purchasing"
  | "purchase_failed"
  | "purchased"
  | "printed"
  | "posted"
  | "delivered"
  | "canceled"
  | "returned";

/** Fiscal document attached to the label. */
export type ShipmentDocumentType = "nfe" | "dce";

export interface Shipment {
  id: string;
  orderId: string;
  creatorId: string;
  buyerId: string;
  status: ShipmentStatus;
  serviceId?: number;
  company?: string;
  documentType?: ShipmentDocumentType;
  invoiceKey?: string;
  /** DC-e only: when the creator confirmed the content declaration, and which text. */
  dceAcceptedAt?: Date;
  dceDeclarationVersion?: string;
  /** Label id on the carrier platform (Melhor Envio order id). */
  providerOrderId?: string;
  protocol?: string;
  trackingCode?: string;
  trackingUrl?: string;
  package?: ShippingPackage;
  costCents?: number;
  purchasedAt?: Date;
  labelPrintedAt?: Date;
  postedAt?: Date;
  deliveredAt?: Date;
  canceledAt?: Date;
  lastTrackingSyncAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
