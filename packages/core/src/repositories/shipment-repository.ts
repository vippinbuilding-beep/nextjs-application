import type {
  Shipment,
  ShipmentDocumentType,
  ShipmentStatus,
} from "../models/shipment";
import type { ShippingPackage } from "../models/shipping";

export interface CreateShipmentInput {
  orderId: string;
  creatorId: string;
  buyerId: string;
  serviceId?: number;
  company?: string;
  package?: ShippingPackage;
}

export interface UpdateShipmentInput {
  status?: ShipmentStatus;
  serviceId?: number;
  company?: string;
  documentType?: ShipmentDocumentType | null;
  invoiceKey?: string | null;
  providerOrderId?: string | null;
  protocol?: string | null;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  package?: ShippingPackage;
  costCents?: number | null;
  purchasedAt?: Date | null;
  labelPrintedAt?: Date | null;
  postedAt?: Date | null;
  deliveredAt?: Date | null;
  canceledAt?: Date | null;
  lastTrackingSyncAt?: Date | null;
  error?: string | null;
}

/** Server-side (service role) persistence for {@link Shipment}. */
export interface ShipmentRepository {
  /** Idempotent: returns the existing shipment when the order already has one. */
  createForOrder(input: CreateShipmentInput): Promise<Shipment>;
  getById(id: string): Promise<Shipment | null>;
  getByOrderId(orderId: string): Promise<Shipment | null>;
  getByProviderOrderId(providerOrderId: string): Promise<Shipment | null>;
  update(id: string, patch: UpdateShipmentInput): Promise<Shipment | null>;
  /**
   * Atomically moves `status` from one of `from` to `to`. Returns the shipment
   * only when THIS call won the claim (used as a lock for label purchase).
   */
  claim(
    id: string,
    from: ShipmentStatus[],
    to: ShipmentStatus,
    patch?: Omit<UpdateShipmentInput, "status">
  ): Promise<Shipment | null>;
  /** Labels that still need tracking sync (oldest sync first). */
  listForTrackingSync(limit: number): Promise<Shipment[]>;
  listByOrderIds(orderIds: string[]): Promise<Shipment[]>;
  /** Labels bought but not yet posted (for the account-wide label limit). */
  countOpenLabels(): Promise<number>;
}
