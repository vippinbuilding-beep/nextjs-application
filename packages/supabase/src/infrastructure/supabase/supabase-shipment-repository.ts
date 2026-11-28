import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Shipment,
  ShipmentDocumentType,
  ShipmentStatus,
} from "@vippin/core/models/shipment";
import type { ShippingPackage } from "@vippin/core/models/shipping";
import type {
  CreateShipmentInput,
  ShipmentRepository,
  UpdateShipmentInput,
} from "@vippin/core/repositories/shipment-repository";

const TABLE = "shipments";

type ShipmentRow = {
  id: string;
  order_id: string;
  creator_id: string;
  buyer_id: string;
  status: string;
  service_id: number | null;
  company: string | null;
  document_type: string | null;
  invoice_key: string | null;
  dce_accepted_at: string | null;
  dce_declaration_version: string | null;
  me_order_id: string | null;
  protocol: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  package: ShippingPackage | null;
  cost_cents: number | null;
  purchased_at: string | null;
  label_printed_at: string | null;
  posted_at: string | null;
  delivered_at: string | null;
  canceled_at: string | null;
  last_tracking_sync_at: string | null;
  error: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** Labels that still change state on the carrier side. */
const TRACKABLE: ShipmentStatus[] = ["purchased", "printed", "posted"];

/**
 * Supabase implementation of {@link ShipmentRepository}. Use with the service
 * role client only (there are no write policies on `shipments`).
 */
export class SupabaseShipmentRepository implements ShipmentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createForOrder(input: CreateShipmentInput): Promise<Shipment> {
    const existing = await this.getByOrderId(input.orderId);
    if (existing) return existing;

    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        order_id: input.orderId,
        creator_id: input.creatorId,
        buyer_id: input.buyerId,
        service_id: input.serviceId ?? null,
        company: input.company ?? null,
        package: input.package ?? null,
      })
      .select("*")
      .single();

    if (error) {
      // Unique (order_id) race: another caller created it first.
      if (error.code === "23505") {
        const again = await this.getByOrderId(input.orderId);
        if (again) return again;
      }
      throw new Error(error.message);
    }
    return toShipment(data as ShipmentRow);
  }

  async getById(id: string): Promise<Shipment | null> {
    return this.getOne("id", id);
  }

  async getByOrderId(orderId: string): Promise<Shipment | null> {
    return this.getOne("order_id", orderId);
  }

  async getByProviderOrderId(providerOrderId: string): Promise<Shipment | null> {
    return this.getOne("me_order_id", providerOrderId);
  }

  async update(id: string, patch: UpdateShipmentInput): Promise<Shipment | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toRow(patch))
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? toShipment(data as ShipmentRow) : null;
  }

  async claim(
    id: string,
    from: ShipmentStatus[],
    to: ShipmentStatus,
    patch: Omit<UpdateShipmentInput, "status"> = {}
  ): Promise<Shipment | null> {
    if (!from.length) return null;
    const { data, error } = await this.client
      .from(TABLE)
      .update({ ...toRow(patch), status: to })
      .eq("id", id)
      .in("status", from)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? toShipment(data as ShipmentRow) : null;
  }

  async listForTrackingSync(limit: number): Promise<Shipment[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .in("status", TRACKABLE)
      .not("me_order_id", "is", null)
      .order("last_tracking_sync_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data as ShipmentRow[]) ?? []).map(toShipment);
  }

  async listByOrderIds(orderIds: string[]): Promise<Shipment[]> {
    if (!orderIds.length) return [];
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .in("order_id", orderIds);

    if (error) throw new Error(error.message);
    return ((data as ShipmentRow[]) ?? []).map(toShipment);
  }

  async countOpenLabels(): Promise<number> {
    const { count, error } = await this.client
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .in("status", ["purchased", "printed"]);

    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  private async getOne(column: string, value: string): Promise<Shipment | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq(column, value)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? toShipment(data as ShipmentRow) : null;
  }
}

function dateOrNull(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function optionalDate(value: string | null): Date | undefined {
  return value ? new Date(value) : undefined;
}

function toRow(patch: UpdateShipmentInput): Partial<ShipmentRow> {
  const row: Partial<ShipmentRow> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.serviceId !== undefined) row.service_id = patch.serviceId;
  if (patch.company !== undefined) row.company = patch.company;
  if (patch.documentType !== undefined) row.document_type = patch.documentType;
  if (patch.invoiceKey !== undefined) row.invoice_key = patch.invoiceKey;
  if (patch.dceAcceptedAt !== undefined)
    row.dce_accepted_at = patch.dceAcceptedAt?.toISOString() ?? null;
  if (patch.dceDeclarationVersion !== undefined)
    row.dce_declaration_version = patch.dceDeclarationVersion;
  if (patch.providerOrderId !== undefined) row.me_order_id = patch.providerOrderId;
  if (patch.protocol !== undefined) row.protocol = patch.protocol;
  if (patch.trackingCode !== undefined) row.tracking_code = patch.trackingCode;
  if (patch.trackingUrl !== undefined) row.tracking_url = patch.trackingUrl;
  if (patch.package !== undefined) row.package = patch.package;
  if (patch.costCents !== undefined) row.cost_cents = patch.costCents;
  if (patch.purchasedAt !== undefined) row.purchased_at = dateOrNull(patch.purchasedAt);
  if (patch.labelPrintedAt !== undefined)
    row.label_printed_at = dateOrNull(patch.labelPrintedAt);
  if (patch.postedAt !== undefined) row.posted_at = dateOrNull(patch.postedAt);
  if (patch.deliveredAt !== undefined) row.delivered_at = dateOrNull(patch.deliveredAt);
  if (patch.canceledAt !== undefined) row.canceled_at = dateOrNull(patch.canceledAt);
  if (patch.lastTrackingSyncAt !== undefined)
    row.last_tracking_sync_at = dateOrNull(patch.lastTrackingSyncAt);
  if (patch.error !== undefined) row.error = patch.error;
  return row;
}

function toShipment(row: ShipmentRow): Shipment {
  return {
    id: row.id,
    orderId: row.order_id,
    creatorId: row.creator_id,
    buyerId: row.buyer_id,
    status: row.status as ShipmentStatus,
    serviceId: row.service_id ?? undefined,
    company: row.company ?? undefined,
    documentType: (row.document_type as ShipmentDocumentType | null) ?? undefined,
    invoiceKey: row.invoice_key ?? undefined,
    dceAcceptedAt: row.dce_accepted_at ? new Date(row.dce_accepted_at) : undefined,
    dceDeclarationVersion: row.dce_declaration_version ?? undefined,
    providerOrderId: row.me_order_id ?? undefined,
    protocol: row.protocol ?? undefined,
    trackingCode: row.tracking_code ?? undefined,
    trackingUrl: row.tracking_url ?? undefined,
    package: row.package ?? undefined,
    costCents: row.cost_cents ?? undefined,
    purchasedAt: optionalDate(row.purchased_at),
    labelPrintedAt: optionalDate(row.label_printed_at),
    postedAt: optionalDate(row.posted_at),
    deliveredAt: optionalDate(row.delivered_at),
    canceledAt: optionalDate(row.canceled_at),
    lastTrackingSyncAt: optionalDate(row.last_tracking_sync_at),
    error: row.error ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}
