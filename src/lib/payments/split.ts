/**
 * Revenue split between the platform and the creator.
 *
 * The platform keeps 10% and the creator receives 90% of the gross amount paid.
 * Repasses are manual: the creator withdraws when balance reaches the minimum.
 * The platform absorbs AbacatePay's fixed outbound fee on that transfer.
 */

export const PLATFORM_FEE_RATE = 0.1;

/** Fixed AbacatePay fee on each outbound `POST /v2/pix/send` (R$ 0,80). */
export const ABACATEPAY_PIX_SEND_FEE_CENTS = parseCentsEnv(
  process.env.ABACATEPAY_PIX_SEND_FEE_CENTS,
  80
);

/** Minimum net balance (90% shares) required for a manual creator withdrawal. */
export const CREATOR_MIN_WITHDRAWAL_CENTS = parseCentsEnv(
  process.env.CREATOR_MIN_WITHDRAWAL_CENTS,
  20
);

function parseCentsEnv(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export interface AmountSplit {
  amountCents: number;
  platformFeeCents: number;
  /** Net amount the creator should receive in their PIX account. */
  creatorAmountCents: number;
}

export function splitAmount(amountCents: number): AmountSplit {
  const creatorAmountCents = Math.round(amountCents * (1 - PLATFORM_FEE_RATE));
  const platformFeeCents = amountCents - creatorAmountCents;
  return { amountCents, platformFeeCents, creatorAmountCents };
}

/** Gross PIX send amount so the recipient nets `netCents` after AbacatePay's fee. */
export function pixSendGrossCents(netCents: number): number {
  return netCents + ABACATEPAY_PIX_SEND_FEE_CENTS;
}
