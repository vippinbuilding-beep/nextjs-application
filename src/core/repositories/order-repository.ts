import type { Order, OrderStatus, TransferStatus } from "@/core/models/order";

export interface CreateOrderInput {
  productId: string;
  buyerId: string;
  creatorId: string;
  amountCents: number;
  platformFeeCents: number;
  creatorAmountCents: number;
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  abacateChargeId?: string;
  brCode?: string;
  brCodeBase64?: string;
  expiresAt?: Date | null;
  paidAt?: Date | null;
  transferStatus?: TransferStatus;
  abacateTransferId?: string | null;
  transferError?: string | null;
}

/**
 * Persistence for {@link Order}. Implementations run server-side (service role),
 * since every write must be authoritative — clients never create or mutate
 * orders directly.
 */
export interface OrderRepository {
  create(input: CreateOrderInput): Promise<Order>;
  getById(id: string): Promise<Order | null>;
  update(id: string, patch: UpdateOrderInput): Promise<Order | null>;
  /**
   * Atomically flips a `pending` order to `paid` (setting `paidAt`). Returns the
   * updated order only when THIS call performed the transition, and `null` if it
   * was already paid (or not pending). This is the idempotency guard that makes
   * the creator repass run exactly once, even if the webhook and the status poll
   * race each other.
   */
  transitionToPaid(id: string): Promise<Order | null>;
  /** Paid orders whose creator repass failed and is eligible for retry. */
  listFailedRepasses(limit: number, minAgeMs: number): Promise<Order[]>;
}
