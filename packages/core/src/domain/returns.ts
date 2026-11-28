/**
 * Direito de arrependimento (CDC art. 49): the buyer may ask to return a
 * physical order within `windowDays` after delivery. The escrow keeps the
 * creator's share during that window (ESCROW_DISPUTE_BUFFER_DAYS), and an open
 * request blocks the automatic release until an admin resolves it.
 */

import { addDays } from "./fulfillment";

export const DEFAULT_RETURN_WINDOW_DAYS = 7;

export const RETURN_REASON_MIN_LENGTH = 10;
export const RETURN_REASON_MAX_LENGTH = 1000;

export type ReturnRequestStatus = "open" | "refunded" | "rejected";

export const RETURN_STATUS_LABELS: Record<ReturnRequestStatus, string> = {
  open: "Devolução solicitada",
  refunded: "Devolução reembolsada",
  rejected: "Devolução recusada",
};

export function returnWindowEndsAt(deliveredAt: Date, windowDays: number): Date {
  return addDays(deliveredAt, windowDays);
}

export function canRequestReturn(
  deliveredAt: Date | null | undefined,
  now: Date,
  windowDays: number
): boolean {
  if (!deliveredAt) return false;
  return now.getTime() <= returnWindowEndsAt(deliveredAt, windowDays).getTime();
}

/** Returns a pt-BR error or null. */
export function validateReturnReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length < RETURN_REASON_MIN_LENGTH)
    return `Conte o motivo da devolução (mínimo de ${RETURN_REASON_MIN_LENGTH} caracteres).`;
  if (trimmed.length > RETURN_REASON_MAX_LENGTH)
    return `O motivo pode ter até ${RETURN_REASON_MAX_LENGTH} caracteres.`;
  return null;
}
