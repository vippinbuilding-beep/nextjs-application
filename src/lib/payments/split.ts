/**
 * Revenue split between the platform and the creator.
 *
 * The platform keeps 10% of each payment. On withdraw, the creator receives
 * the accrued 90% minus one AbacatePay outbound PIX fee (R$ 0,80) per saque.
 */

export const PLATFORM_FEE_RATE = 0.1;

/** Fixed AbacatePay fee on each outbound `POST /v2/pix/send` (R$ 0,80). */
export const ABACATEPAY_PIX_SEND_FEE_CENTS = 80;

function parseCentsEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Minimum net balance before a creator can request a manual withdraw (default R$ 20,00). */
export const CREATOR_MIN_WITHDRAWAL_CENTS = parseCentsEnv(
  "CREATOR_MIN_WITHDRAWAL_CENTS",
  2000
);

export interface AmountSplit {
  amountCents: number;
  platformFeeCents: number;
  /** Net amount the creator should receive in their PIX account. */
  creatorAmountCents: number;
}

export function splitAmount(amountCents: number): AmountSplit {
  const creatorAmountCents = creatorAccruedCents(amountCents);
  const platformFeeCents = amountCents - creatorAmountCents;
  return { amountCents, platformFeeCents, creatorAmountCents };
}

/** Creator share after the 10% platform fee (before outbound PIX fee). */
export function creatorAccruedCents(grossCents: number): number {
  return Math.round(grossCents * (1 - PLATFORM_FEE_RATE));
}

/**
 * Net amount that lands in the creator's PIX on withdraw:
 * sum(90% of sales) − R$ 0,80 (one fee per saque).
 */
export function creatorWithdrawNetCents(accruedCents: number): number {
  return Math.max(0, accruedCents - ABACATEPAY_PIX_SEND_FEE_CENTS);
}

/** Single payment: gross − 10% − R$ 0,80. */
export function creatorPayoutFromGross(grossCents: number): number {
  return creatorWithdrawNetCents(creatorAccruedCents(grossCents));
}

/** Gross PIX send amount so the recipient nets `netCents` after AbacatePay's fee. */
export function pixSendGrossCents(netCents: number): number {
  return netCents + ABACATEPAY_PIX_SEND_FEE_CENTS;
}
