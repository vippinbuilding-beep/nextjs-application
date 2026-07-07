/**
 * Revenue split between the platform and the creator.
 *
 * Fee percent comes from `NEXT_PUBLIC_PLATFORM_FEE_PERCENT` (see `platform-fee.ts`).
 * AbacatePay's outbound PIX fee (R$ 0,80) is absorbed by the platform on
 * withdraw — it is not deducted from the creator's balance.
 */

import { PLATFORM_FEE_RATE } from "@/lib/payments/platform-fee";

export {
  CREATOR_FEE_PERCENT,
  PLATFORM_FEE_PERCENT,
  PLATFORM_FEE_RATE,
  creatorMePergunteFeeDescription,
  creatorWithdrawBalanceDescription,
  formatCreatorFeePercent,
  formatPlatformFeePercent,
} from "@/lib/payments/platform-fee";

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
  /** Amount credited to the creator (gross minus platform fee). */
  creatorAmountCents: number;
}

export function splitAmount(amountCents: number): AmountSplit {
  const creatorAmountCents = creatorAccruedCents(amountCents);
  const platformFeeCents = amountCents - creatorAmountCents;
  return { amountCents, platformFeeCents, creatorAmountCents };
}

/** Creator share after the platform fee. */
export function creatorAccruedCents(grossCents: number): number {
  return Math.round(grossCents * (1 - PLATFORM_FEE_RATE));
}

/** Net amount that lands in the creator's PIX on withdraw (equals accrued total). */
export function creatorWithdrawNetCents(accruedCents: number): number {
  return Math.max(0, accruedCents);
}

/** Single payment: gross minus platform fee percent. */
export function creatorPayoutFromGross(grossCents: number): number {
  return creatorAccruedCents(grossCents);
}

/** Gross PIX send amount so the recipient nets `netCents` after AbacatePay's fee. */
export function pixSendGrossCents(netCents: number): number {
  return netCents + ABACATEPAY_PIX_SEND_FEE_CENTS;
}
