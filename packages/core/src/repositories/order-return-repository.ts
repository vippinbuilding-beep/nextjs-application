import type { ReturnRequestStatus } from "../domain/returns";
import type { OrderReturnRequest } from "../models/order-return";

export interface CreateOrderReturnInput {
  orderId: string;
  buyerId: string;
  creatorId: string;
  reason: string;
}

/** Server-side (service role) persistence for {@link OrderReturnRequest}. */
export interface OrderReturnRepository {
  /** Returns null when the order already has a request (unique order_id). */
  create(input: CreateOrderReturnInput): Promise<OrderReturnRequest | null>;
  getByOrderId(orderId: string): Promise<OrderReturnRequest | null>;
  listByOrderIds(orderIds: string[]): Promise<OrderReturnRequest[]>;
  /** Open requests, oldest first. */
  listOpen(limit: number): Promise<OrderReturnRequest[]>;
  /** Atomically closes an OPEN request; null if it was not open. */
  resolve(
    orderId: string,
    status: Exclude<ReturnRequestStatus, "open">,
    resolvedBy: string | null,
    note?: string
  ): Promise<OrderReturnRequest | null>;
  markAlerted(ids: string[], at: Date): Promise<void>;
}
