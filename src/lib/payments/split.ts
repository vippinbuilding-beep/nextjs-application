/**
 * Revenue split between the platform and the creator.
 *
 * Per sale: R$ 0,80 (AbacatePay per item) is deducted first, then the platform
 * keeps `PLATFORM_FEE_PERCENT` of the remainder.
 * On withdraw: creator balance loses one more R$ 0,80 (outbound PIX fee).
 */

import {
  ABACATEPAY_PIX_SEND_FEE_CENTS,
  PLATFORM_FEE_RATE,
} from "@/lib/payments/platform-fee";

export {
  ABACATEPAY_PIX_SEND_FEE_CENTS,
  CREATOR_FEE_PERCENT,
  PLATFORM_FEE_PERCENT,
  PLATFORM_FEE_RATE,
  creatorMePergunteFeeDescription,
  creatorWithdrawBalanceDescription,
  formatCreatorFeePercent,
  formatPlatformFeePercent,
} from "@/lib/payments/platform-fee";

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
  /** Credited to creator after per-sale R$ 0,80 + percent (before withdraw PIX fee). */
  creatorAmountCents: number;
}

/** Per-sale fee breakdown for creator-facing UI labels. */
export interface CreatorPayoutBreakdown {
  grossCents: number;
  /** Inbound PIX fee (R$ 0,80) deducted before the platform percent. */
  salePixFeeCents: number;
  /** Platform percent on the remainder after the inbound PIX fee. */
  platformPercentFeeCents: number;
  /** Credited to creator balance after the sale (before withdraw PIX fee). */
  accruedCents: number;
  /** Outbound PIX fee on withdraw (R$ 0,80, once per transfer). */
  withdrawPixFeeCents: number;
  /** Net amount received on PIX when withdrawing this sale alone. */
  netWithdrawCents: number;
}

export function splitAmount(amountCents: number): AmountSplit {
  const creatorAmountCents = creatorAccruedCents(amountCents);
  const platformFeeCents = amountCents - creatorAmountCents;
  return { amountCents, platformFeeCents, creatorAmountCents };
}

/**
 * Creator share per sale: (gross − R$ 0,80) × (1 − platform%).
 * Stored on the order/question until withdraw.
 */
export function creatorAccruedCents(grossCents: number): number {
  const afterPixFee = Math.max(0, grossCents - ABACATEPAY_PIX_SEND_FEE_CENTS);
  return Math.round(afterPixFee * (1 - PLATFORM_FEE_RATE));
}

/**
 * Net PIX on withdraw: sum(per-sale creator shares) − R$ 0,80 (one outbound PIX).
 */
export function creatorWithdrawNetCents(accruedCents: number): number {
  return Math.max(0, accruedCents - ABACATEPAY_PIX_SEND_FEE_CENTS);
}

/** Single payment: gross − R$ 0,80 per sale − platform% on remainder − R$ 0,80 on withdraw. */
export function creatorPayoutFromGross(grossCents: number): number {
  return creatorWithdrawNetCents(creatorAccruedCents(grossCents));
}

export function getCreatorPayoutBreakdown(
  grossCents: number
): CreatorPayoutBreakdown {
  const salePixFeeCents =
    grossCents <= 0
      ? 0
      : Math.min(grossCents, ABACATEPAY_PIX_SEND_FEE_CENTS);
  const afterSalePix = Math.max(0, grossCents - ABACATEPAY_PIX_SEND_FEE_CENTS);
  const platformPercentFeeCents = Math.round(afterSalePix * PLATFORM_FEE_RATE);
  const accruedCents = creatorAccruedCents(grossCents);
  const withdrawPixFeeCents =
    accruedCents > 0 ? ABACATEPAY_PIX_SEND_FEE_CENTS : 0;
  const netWithdrawCents = creatorPayoutFromGross(grossCents);

  return {
    grossCents,
    salePixFeeCents,
    platformPercentFeeCents,
    accruedCents,
    withdrawPixFeeCents,
    netWithdrawCents,
  };
}

/** Returns an error when the gross price cannot fund the per-sale platform fees. */
export function validateGrossCoversSaleFees(grossCents: number): string | null {
  if (grossCents <= 0) return null;
  if (creatorAccruedCents(grossCents) > 0) return null;
  return "Preço muito baixo para cobrir as taxas da plataforma.";
}

/** Gross PIX send amount so the recipient nets `netCents` after AbacatePay's fee. */
export function pixSendGrossCents(netCents: number): number {
  return netCents + ABACATEPAY_PIX_SEND_FEE_CENTS;
}
