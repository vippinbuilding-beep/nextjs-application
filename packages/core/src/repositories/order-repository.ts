import type {
  FulfillmentStatus,
  Order,
  OrderStatus,
  TransferStatus,
} from "../models/order";
import type { ShippingMode } from "../models/product";
import type {
  ShippingAddress,
  ShippingQuoteSnapshot,
} from "../models/shipping";

export interface CreateOrderInput {
  productId: string;
  buyerId: string;
  creatorId: string;
  amountCents: number;
  platformFeeCents: number;
  creatorAmountCents: number;
  // Physical products only.
  shippingMode?: ShippingMode;
  shippingQuote?: ShippingQuoteSnapshot;
  shippingChargedCents?: number;
  shippingAbsorbedCents?: number;
  shipTo?: ShippingAddress;
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
  shippingCostCents?: number | null;
  fulfillmentStatus?: FulfillmentStatus;
  prepareDeadlineAt?: Date | null;
  postDeadlineAt?: Date | null;
  releasedAt?: Date | null;
  refundedAt?: Date | null;
  adminHoldAt?: Date | null;
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
  /**
   * Atomically moves `fulfillmentStatus` from one of `from` to `to` (plus any
   * extra fields). Returns the order only when THIS call won the transition;
   * `null` when the order was not in an allowed state (already moved).
   */
  transitionFulfillment(
    id: string,
    from: FulfillmentStatus[],
    to: FulfillmentStatus,
    patch?: Omit<UpdateOrderInput, "fulfillmentStatus">
  ): Promise<Order | null>;
  /** Physical orders in the given fulfillment states (oldest first). */
  listByFulfillmentStatus(
    statuses: FulfillmentStatus[],
    limit: number
  ): Promise<Order[]>;
  /** Paid physical orders sold by a creator (most recent first). */
  listPhysicalByCreator(creatorId: string, limit?: number): Promise<Order[]>;
  /**
   * Count and total (`amountCents`) of the creator's physical orders paid since
   * `since` that are still paid (refunded ones don't count). Feeds the monthly
   * pessoa física limit.
   */
  summarizePhysicalPaidByCreatorSince(
    creatorId: string,
    since: Date
  ): Promise<{ count: number; amountCents: number }>;
  /** Paid physical orders bought by a user (most recent first). */
  listPhysicalByBuyer(buyerId: string, limit?: number): Promise<Order[]>;
  /** Paid orders awaiting (or retrying) the weekly creator repass batch. */
  listPendingCreatorRepasses(limit: number): Promise<Order[]>;
  /**
   * Paid orders awaiting repass for a single creator (manual withdraw).
   * Physical orders only count once released from escrow.
   */
  listPendingCreatorRepassesByCreator(creatorId: string): Promise<Order[]>;
  /** Physical orders whose creator share is still in escrow. */
  listHeldByCreator(creatorId: string): Promise<Order[]>;
  /** Paid orders whose creator repass previously failed. */
  listFailedCreatorRepasses(limit: number, minAgeMs: number): Promise<Order[]>;
}
