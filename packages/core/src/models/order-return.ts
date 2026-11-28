import type { ReturnRequestStatus } from "../domain/returns";

/** A buyer's request to return a delivered physical order (arrependimento). */
export interface OrderReturnRequest {
  id: string;
  orderId: string;
  buyerId: string;
  creatorId: string;
  reason: string;
  status: ReturnRequestStatus;
  resolutionNote?: string;
  requestedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  lastAlertedAt?: Date;
}
