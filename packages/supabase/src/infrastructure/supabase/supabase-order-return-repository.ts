import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReturnRequestStatus } from "@vippin/core/domain/returns";
import type { OrderReturnRequest } from "@vippin/core/models/order-return";
import type {
  CreateOrderReturnInput,
  OrderReturnRepository,
} from "@vippin/core/repositories/order-return-repository";

const TABLE = "order_return_requests";

type OrderReturnRow = {
  id: string;
  order_id: string;
  buyer_id: string;
  creator_id: string;
  reason: string;
  status: string;
  resolution_note: string | null;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  last_alerted_at: string | null;
};

/** Use with the service role client only (no write policies on the table). */
export class SupabaseOrderReturnRepository implements OrderReturnRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateOrderReturnInput): Promise<OrderReturnRequest | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        order_id: input.orderId,
        buyer_id: input.buyerId,
        creator_id: input.creatorId,
        reason: input.reason.trim(),
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") return null;
      throw new Error(error.message);
    }
    return toOrderReturn(data as OrderReturnRow);
  }

  async getByOrderId(orderId: string): Promise<OrderReturnRequest | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toOrderReturn(data as OrderReturnRow) : null;
  }

  async listByOrderIds(orderIds: string[]): Promise<OrderReturnRequest[]> {
    if (orderIds.length === 0) return [];
    const { data, error } = await this.client.from(TABLE).select("*").in("order_id", orderIds);
    if (error) throw new Error(error.message);
    return ((data as OrderReturnRow[]) ?? []).map(toOrderReturn);
  }

  async listOpen(limit: number): Promise<OrderReturnRequest[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("status", "open")
      .order("requested_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return ((data as OrderReturnRow[]) ?? []).map(toOrderReturn);
  }

  async resolve(
    orderId: string,
    status: Exclude<ReturnRequestStatus, "open">,
    resolvedBy: string | null,
    note?: string
  ): Promise<OrderReturnRequest | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_note: note?.slice(0, 500) ?? null,
      })
      .eq("order_id", orderId)
      .eq("status", "open")
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toOrderReturn(data as OrderReturnRow) : null;
  }

  async markAlerted(ids: string[], at: Date): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.client
      .from(TABLE)
      .update({ last_alerted_at: at.toISOString() })
      .in("id", ids);
    if (error) throw new Error(error.message);
  }
}

function toOrderReturn(row: OrderReturnRow): OrderReturnRequest {
  return {
    id: row.id,
    orderId: row.order_id,
    buyerId: row.buyer_id,
    creatorId: row.creator_id,
    reason: row.reason,
    status: row.status as ReturnRequestStatus,
    resolutionNote: row.resolution_note ?? undefined,
    requestedAt: new Date(row.requested_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    resolvedBy: row.resolved_by ?? undefined,
    lastAlertedAt: row.last_alerted_at ? new Date(row.last_alerted_at) : undefined,
  };
}
