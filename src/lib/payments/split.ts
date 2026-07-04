/**
 * Revenue split between the platform and the creator.
 *
 * The platform keeps 10% and the creator receives 90% of the gross amount paid.
 * The platform absorbs AbacatePay's own fees, so the creator always gets a clean
 * 90% of the price. Amounts are in integer cents; the creator's share is rounded
 * and the platform takes the remainder so `platform + creator == amount` exactly
 * (matching the DB CHECK constraint on `orders`).
 */

export const PLATFORM_FEE_RATE = 0.1;

export interface AmountSplit {
  amountCents: number;
  platformFeeCents: number;
  creatorAmountCents: number;
}

export function splitAmount(amountCents: number): AmountSplit {
  const creatorAmountCents = Math.round(amountCents * (1 - PLATFORM_FEE_RATE));
  const platformFeeCents = amountCents - creatorAmountCents;
  return { amountCents, platformFeeCents, creatorAmountCents };
}
