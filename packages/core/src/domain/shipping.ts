/**
 * Pure shipping/freight rules for physical products (no I/O).
 *
 * Money model (integer cents):
 *   buyer_pays: base = price;           PIX = price + freight
 *   free:       base = price − freight; PIX = price
 *   platformFee = base − accrued(base); creatorAmount = accrued(base)
 *   amount = platformFee + creatorAmount + shippingCharged + shippingAbsorbed
 *
 * Computing the platform fee on `price − freight` in free mode keeps both modes
 * equivalent for the creator: the same total paid by the buyer yields the same
 * net, so offering free shipping isn't penalized.
 *
 * Example (10% + R$ 0,80, price R$ 50, freight R$ 20):
 *   buyer_pays → PIX 7000, creator 4428 (accrued(5000))
 *   free       → PIX 5000, creator 2628 (accrued(3000))
 */

import type { ShippingMode } from "../models/product";
import type {
  ShippingPackage,
  ShippingQuoteOption,
} from "../models/shipping";

/** Per-sale fee configuration (mirrors the web app's platform-fee settings). */
export interface SaleFeeConfig {
  /** Fixed fee deducted first (AbacatePay, R$ 0,80). */
  saleFixedFeeCents: number;
  /** Platform percent on the remainder, as a rate (0.10 = 10%). */
  platformFeeRate: number;
}

export const PHYSICAL_PRODUCT_LIMITS = {
  /** R$ 5,00. */
  priceMinCents: 500,
  /** R$ 1.000,00 (digital products stay capped at R$ 100,00). */
  priceMaxCents: 100_000,
  weightMinGrams: 1,
  weightMaxGrams: 30_000,
  dimensionMinCm: 1,
  dimensionMaxCm: 100,
  stockMax: 100_000,
} as const;

/** Creator share after the fixed fee and the platform percent. */
export function accruedCents(grossCents: number, config: SaleFeeConfig): number {
  const afterFixed = Math.max(0, grossCents - config.saleFixedFeeCents);
  return Math.round(afterFixed * (1 - config.platformFeeRate));
}

export interface PhysicalOrderSplitInput {
  priceCents: number;
  mode: ShippingMode;
  /** Quoted freight for the chosen service. */
  shippingCents: number;
}

export interface PhysicalOrderSplit {
  /** Charged on the PIX. */
  amountCents: number;
  platformFeeCents: number;
  creatorAmountCents: number;
  shippingChargedCents: number;
  shippingAbsorbedCents: number;
  /** Amount the fees are calculated on. */
  baseCents: number;
}

export function computePhysicalOrderSplit(
  input: PhysicalOrderSplitInput,
  config: SaleFeeConfig
): PhysicalOrderSplit {
  const priceCents = Math.max(0, Math.round(input.priceCents));
  const shippingCents = Math.max(0, Math.round(input.shippingCents));

  if (input.mode === "free") {
    const baseCents = Math.max(0, priceCents - shippingCents);
    const creatorAmountCents = accruedCents(baseCents, config);
    // When the freight exceeds the price the order is not viable; callers must
    // check `canOfferFreeShipping` first. Clamp so the sum still holds.
    const shippingAbsorbedCents = priceCents - baseCents;
    return {
      amountCents: priceCents,
      platformFeeCents: baseCents - creatorAmountCents,
      creatorAmountCents,
      shippingChargedCents: 0,
      shippingAbsorbedCents,
      baseCents,
    };
  }

  const creatorAmountCents = accruedCents(priceCents, config);
  return {
    amountCents: priceCents + shippingCents,
    platformFeeCents: priceCents - creatorAmountCents,
    creatorAmountCents,
    shippingChargedCents: shippingCents,
    shippingAbsorbedCents: 0,
    baseCents: priceCents,
  };
}

/**
 * Free shipping is only viable when, after paying the freight, the creator
 * still nets at least `minCreatorNetCents` from the sale.
 */
export function canOfferFreeShipping(
  priceCents: number,
  shippingCents: number,
  config: SaleFeeConfig,
  minCreatorNetCents: number
): boolean {
  if (shippingCents >= priceCents) return false;
  const base = priceCents - shippingCents;
  if (base <= config.saleFixedFeeCents) return false;
  return accruedCents(base, config) >= minCreatorNetCents;
}

/** Cheapest option (ties → faster delivery). */
export function pickCheapestOption(
  options: ShippingQuoteOption[]
): ShippingQuoteOption | null {
  if (!options.length) return null;
  return [...options].sort(
    (a, b) => a.priceCents - b.priceCents || a.deliveryDays - b.deliveryDays
  )[0]!;
}

/** Validates a physical package; returns a pt-BR error or null. */
export function validateShippingPackage(pkg: Partial<ShippingPackage>): string | null {
  const L = PHYSICAL_PRODUCT_LIMITS;
  const weight = pkg.weightGrams ?? 0;
  if (!Number.isInteger(weight) || weight < L.weightMinGrams || weight > L.weightMaxGrams) {
    return `O peso precisa estar entre ${L.weightMinGrams} g e ${L.weightMaxGrams / 1000} kg.`;
  }
  const dims: [keyof ShippingPackage, string][] = [
    ["lengthCm", "comprimento"],
    ["widthCm", "largura"],
    ["heightCm", "altura"],
  ];
  for (const [key, label] of dims) {
    const value = pkg[key] ?? 0;
    if (!Number.isInteger(value) || value < L.dimensionMinCm || value > L.dimensionMaxCm) {
      return `A ${label} precisa estar entre ${L.dimensionMinCm} e ${L.dimensionMaxCm} cm.`;
    }
  }
  return null;
}

/** Integer reais → cents helper for carrier prices given as decimal strings. */
export function decimalReaisToCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

/** Correios object code: 2 letters + 9 digits + 2 letters (e.g. AA123456789BR). */
const CORREIOS_CODE = /^[A-Z]{2}\d{9}[A-Z]{2}$/;

/**
 * Public tracking link for the buyer/creator. Correios codes open the Correios
 * tracking page with the code pre-filled (`?objetos=`, the same link Correios
 * uses in its own share buttons; the person still clicks "Consultar" because of
 * the site's captcha). Other carriers keep the provider's link.
 */
export function carrierTrackingUrl(input: {
  company: string | null | undefined;
  trackingCode: string | null | undefined;
  fallbackUrl: string | null | undefined;
}): string | null {
  const code = input.trackingCode?.trim().toUpperCase() ?? "";
  const isCorreios = !input.company || /correios/i.test(input.company);
  if (code && isCorreios && CORREIOS_CODE.test(code)) {
    return `https://rastreamento.correios.com.br/app/index.php?objetos=${code}`;
  }
  return input.fallbackUrl ?? null;
}
