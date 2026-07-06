/**
 * Revenue split between the platform and the creator.
 *
 * The platform keeps 10% and the creator receives 90% of the gross amount paid.
 * Repasses are batched weekly (one PIX por criador); the platform absorbs
 * AbacatePay's fixed outbound fee on that single transfer.
 */

export const PLATFORM_FEE_RATE = 0.1;

/** Fixed AbacatePay fee on each outbound `POST /v2/pix/send` (R$ 0,80). */
export const ABACATEPAY_PIX_SEND_FEE_CENTS = 80;

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
