import type { SupabaseClient } from "@supabase/supabase-js";

import type { Order, OrderStatus, TransferStatus } from "@/core/models/order";
import type {
  CreateOrderInput,
  OrderRepository,
  UpdateOrderInput,
} from "@/core/repositories/order-repository";

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
  created_at: string | null;
  updated_at: string | null;
};

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

  async listPendingCreatorRepasses(limit: number): Promise<Order[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("status", "paid")
      .in("transfer_status", ["pending", "failed"])
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
      .order("paid_at", { ascending: true });

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
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data as OrderRow[]) ?? []).map(toOrder);
  }
}

function toRow(patch: UpdateOrderInput): Partial<OrderRow> {
  const row: Partial<OrderRow> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.abacateChargeId !== undefined)
    row.abacate_charge_id = patch.abacateChargeId;
  if (patch.brCode !== undefined) row.br_code = patch.brCode;
  if (patch.brCodeBase64 !== undefined) row.br_code_base64 = patch.brCodeBase64;
  if (patch.expiresAt !== undefined)
    row.expires_at = patch.expiresAt ? patch.expiresAt.toISOString() : null;
  if (patch.paidAt !== undefined)
    row.paid_at = patch.paidAt ? patch.paidAt.toISOString() : null;
  if (patch.transferStatus !== undefined)
    row.transfer_status = patch.transferStatus;
  if (patch.abacateTransferId !== undefined)
    row.abacate_transfer_id = patch.abacateTransferId;
  if (patch.transferError !== undefined)
    row.transfer_error = patch.transferError;
  return row;
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
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
    transferStatus: row.transfer_status as TransferStatus,
    abacateTransferId: row.abacate_transfer_id ?? undefined,
    transferError: row.transfer_error ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}
