import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  FulfillmentStatus,
  Order,
  OrderStatus,
  TransferStatus,
} from "@vippin/core/models/order";
import type { ShippingMode } from "@vippin/core/models/product";
import type {
  ShippingAddress,
  ShippingQuoteSnapshot,
} from "@vippin/core/models/shipping";
import type {
  CreateOrderInput,
  OrderRepository,
  UpdateOrderInput,
} from "@vippin/core/repositories/order-repository";

const TABLE = "orders";

type OrderRow = {
  id: string;
  product_id: string;
  buyer_id: string;
  creator_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  creator_amount_cents: number;
  status: string;
  abacate_charge_id: string | null;
  br_code: string | null;
  br_code_base64: string | null;
  expires_at: string | null;
  paid_at: string | null;
  transfer_status: string;
  abacate_transfer_id: string | null;
  transfer_error: string | null;
  shipping_mode: string | null;
  shipping_quote: ShippingQuoteSnapshot | null;
  shipping_charged_cents: number | null;
  shipping_absorbed_cents: number | null;
  shipping_cost_cents: number | null;
  ship_to_name: string | null;
  ship_to_document: string | null;
  ship_to_phone: string | null;
  ship_to_email: string | null;
  ship_to_postal_code: string | null;
  ship_to_street: string | null;
  ship_to_number: string | null;
  ship_to_complement: string | null;
  ship_to_district: string | null;
  ship_to_city: string | null;
  ship_to_state: string | null;
  fulfillment_status: string | null;
  prepare_deadline_at: string | null;
  post_deadline_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  admin_hold_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** Repass-eligible fulfillment states: digital (`none`) or released escrow. */
const REPASS_ELIGIBLE_FULFILLMENT = ["none", "released"];

/**
 * Supabase implementation of {@link OrderRepository}.
 *
 * Constructed with an explicit Supabase client so it can run with the service
 * role inside Route Handlers (writes bypass RLS and stay server-authoritative).
 */
export class SupabaseOrderRepository implements OrderRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateOrderInput): Promise<Order> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        product_id: input.productId,
        buyer_id: input.buyerId,
        creator_id: input.creatorId,
        amount_cents: input.amountCents,
        platform_fee_cents: input.platformFeeCents,
        creator_amount_cents: input.creatorAmountCents,
        shipping_mode: input.shippingMode ?? null,
        // Physical orders are born in escrow: never withdrawable before release.
        ...(input.shippingMode ? { transfer_status: "held" } : {}),
        shipping_quote: input.shippingQuote ?? null,
        shipping_charged_cents: input.shippingChargedCents ?? 0,
        shipping_absorbed_cents: input.shippingAbsorbedCents ?? 0,
        ...shipToRow(input.shipTo),
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return toOrder(data as OrderRow);
  }

  async getById(id: string): Promise<Order | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return toOrder(data as OrderRow);
  }

  async update(id: string, patch: UpdateOrderInput): Promise<Order | null> {
    const row = toRow(patch);
    const { data, error } = await this.client
      .from(TABLE)
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return toOrder(data as OrderRow);
  }

  async transitionToPaid(id: string): Promise<Order | null> {
    // Conditional update: only succeeds while the order is still `pending`, so
    // exactly one caller (webhook vs. status poll) wins the transition.
    const { data, error } = await this.client
      .from(TABLE)
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return toOrder(data as OrderRow);
  }

  async transitionFulfillment(
    id: string,
    from: FulfillmentStatus[],
    to: FulfillmentStatus,
    patch: Omit<UpdateOrderInput, "fulfillmentStatus"> = {}
  ): Promise<Order | null> {
    if (!from.length) return null;
    const row = { ...toRow(patch), fulfillment_status: to };
    const { data, error } = await this.client
      .from(TABLE)
      .update(row)
      .eq("id", id)
      .in("fulfillment_status", from)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return toOrder(data as OrderRow);
  }

  async listByFulfillmentStatus(
    statuses: FulfillmentStatus[],
    limit: number
  ): Promise<Order[]> {
    if (!statuses.length) return [];
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("status", "paid")
      .in("fulfillment_status", statuses)
      .order("paid_at", { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data as OrderRow[]) ?? []).map(toOrder);
  }

  async listPhysicalByCreator(creatorId: string, limit = 200): Promise<Order[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("creator_id", creatorId)
      .in("status", ["paid", "refunded"])
      .neq("fulfillment_status", "none")
      .order("paid_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data as OrderRow[]) ?? []).map(toOrder);
  }

  async summarizePhysicalPaidByCreatorSince(
    creatorId: string,
    since: Date
  ): Promise<{ count: number; amountCents: number }> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("amount_cents")
      .eq("creator_id", creatorId)
      .eq("status", "paid")
      .neq("fulfillment_status", "none")
      .gte("paid_at", since.toISOString());

    if (error) throw new Error(error.message);
    const rows = (data as { amount_cents: number }[]) ?? [];
    return {
      count: rows.length,
      amountCents: rows.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0),
    };
  }

  async listPhysicalByBuyer(buyerId: string, limit = 100): Promise<Order[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("buyer_id", buyerId)
      .in("status", ["paid", "refunded"])
      .neq("fulfillment_status", "none")
      .order("paid_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data as OrderRow[]) ?? []).map(toOrder);
  }

  async listPendingCreatorRepasses(limit: number): Promise<Order[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("status", "paid")
      .in("transfer_status", ["pending", "failed"])
      .in("fulfillment_status", REPASS_ELIGIBLE_FULFILLMENT)
      .order("paid_at", { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data as OrderRow[]) ?? []).map(toOrder);
  }

  async listPendingCreatorRepassesByCreator(creatorId: string): Promise<Order[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("creator_id", creatorId)
      .eq("status", "paid")
      .in("transfer_status", ["pending", "failed"])
      .in("fulfillment_status", REPASS_ELIGIBLE_FULFILLMENT)
      .order("paid_at", { ascending: true });

    if (error) throw new Error(error.message);
    return ((data as OrderRow[]) ?? []).map(toOrder);
  }

  async listHeldByCreator(creatorId: string): Promise<Order[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("creator_id", creatorId)
      .eq("status", "paid")
      .eq("transfer_status", "held");

    if (error) throw new Error(error.message);
    return ((data as OrderRow[]) ?? []).map(toOrder);
  }

  async listFailedCreatorRepasses(
    limit: number,
    minAgeMs: number
  ): Promise<Order[]> {
    const cutoff = new Date(Date.now() - minAgeMs).toISOString();
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("status", "paid")
      .eq("transfer_status", "failed")
      .in("fulfillment_status", REPASS_ELIGIBLE_FULFILLMENT)
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data as OrderRow[]) ?? []).map(toOrder);
  }
}

function dateOrNull(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function shipToRow(address: ShippingAddress | undefined): Partial<OrderRow> {
  if (!address) return {};
  return {
    ship_to_name: address.name,
    ship_to_document: address.document,
    ship_to_phone: address.phone,
    ship_to_email: address.email ?? null,
    ship_to_postal_code: address.postalCode,
    ship_to_street: address.street,
    ship_to_number: address.number,
    ship_to_complement: address.complement ?? null,
    ship_to_district: address.district,
    ship_to_city: address.city,
    ship_to_state: address.state,
  };
}

function toRow(patch: UpdateOrderInput): Partial<OrderRow> {
  const row: Partial<OrderRow> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.abacateChargeId !== undefined)
    row.abacate_charge_id = patch.abacateChargeId;
  if (patch.brCode !== undefined) row.br_code = patch.brCode;
  if (patch.brCodeBase64 !== undefined) row.br_code_base64 = patch.brCodeBase64;
  if (patch.expiresAt !== undefined) row.expires_at = dateOrNull(patch.expiresAt);
  if (patch.paidAt !== undefined) row.paid_at = dateOrNull(patch.paidAt);
  if (patch.transferStatus !== undefined)
    row.transfer_status = patch.transferStatus;
  if (patch.abacateTransferId !== undefined)
    row.abacate_transfer_id = patch.abacateTransferId;
  if (patch.transferError !== undefined)
    row.transfer_error = patch.transferError;
  if (patch.shippingCostCents !== undefined)
    row.shipping_cost_cents = patch.shippingCostCents;
  if (patch.fulfillmentStatus !== undefined)
    row.fulfillment_status = patch.fulfillmentStatus;
  if (patch.prepareDeadlineAt !== undefined)
    row.prepare_deadline_at = dateOrNull(patch.prepareDeadlineAt);
  if (patch.postDeadlineAt !== undefined)
    row.post_deadline_at = dateOrNull(patch.postDeadlineAt);
  if (patch.releasedAt !== undefined) row.released_at = dateOrNull(patch.releasedAt);
  if (patch.refundedAt !== undefined) row.refunded_at = dateOrNull(patch.refundedAt);
  if (patch.adminHoldAt !== undefined) row.admin_hold_at = dateOrNull(patch.adminHoldAt);
  return row;
}

function toShipTo(row: OrderRow): ShippingAddress | undefined {
  if (!row.ship_to_postal_code || !row.ship_to_name) return undefined;
  return {
    name: row.ship_to_name,
    document: row.ship_to_document ?? "",
    phone: row.ship_to_phone ?? "",
    email: row.ship_to_email ?? undefined,
    postalCode: row.ship_to_postal_code,
    street: row.ship_to_street ?? "",
    number: row.ship_to_number ?? "",
    complement: row.ship_to_complement ?? undefined,
    district: row.ship_to_district ?? "",
    city: row.ship_to_city ?? "",
    state: row.ship_to_state ?? "",
  };
}

function optionalDate(value: string | null): Date | undefined {
  return value ? new Date(value) : undefined;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    productId: row.product_id,
    buyerId: row.buyer_id,
    creatorId: row.creator_id,
    amountCents: row.amount_cents,
    platformFeeCents: row.platform_fee_cents,
    creatorAmountCents: row.creator_amount_cents,
    status: row.status as OrderStatus,
    abacateChargeId: row.abacate_charge_id ?? undefined,
    brCode: row.br_code ?? undefined,
    brCodeBase64: row.br_code_base64 ?? undefined,
    expiresAt: optionalDate(row.expires_at),
    paidAt: optionalDate(row.paid_at),
    transferStatus: row.transfer_status as TransferStatus,
    abacateTransferId: row.abacate_transfer_id ?? undefined,
    transferError: row.transfer_error ?? undefined,
    shippingMode: (row.shipping_mode as ShippingMode | null) ?? undefined,
    shippingQuote: row.shipping_quote ?? undefined,
    shippingChargedCents: row.shipping_charged_cents ?? 0,
    shippingAbsorbedCents: row.shipping_absorbed_cents ?? 0,
    shippingCostCents: row.shipping_cost_cents ?? undefined,
    shipTo: toShipTo(row),
    fulfillmentStatus: (row.fulfillment_status as FulfillmentStatus | null) ?? "none",
    prepareDeadlineAt: optionalDate(row.prepare_deadline_at),
    postDeadlineAt: optionalDate(row.post_deadline_at),
    releasedAt: optionalDate(row.released_at),
    refundedAt: optionalDate(row.refunded_at),
    adminHoldAt: optionalDate(row.admin_hold_at),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}
