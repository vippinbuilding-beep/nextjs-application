import "server-only";

import {
  canOfferFreeShipping,
  computePhysicalOrderSplit,
  pickCheapestOption,
} from "@vippin/core/domain/shipping";
import type { ShippingMode } from "@vippin/core/models/product";
import type {
  ShipFromAddress,
  ShippingPackage,
  ShippingQuoteOption,
} from "@vippin/core/models/shipping";
import { getShippingGateway } from "@vippin/supabase/factories/shipping-factory";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import {
  MIN_CREATOR_NET_CENTS,
  REFERENCE_DESTINATIONS,
  SALE_FEE_CONFIG,
  allowedServiceIds,
} from "@/lib/shipping/config";
import { creatorWithdrawNetCents } from "@/lib/payments/split";

export interface PhysicalProductContext {
  id: string;
  creatorId: string;
  title: string;
  status: string;
  priceCents: number;
  shippingMode: ShippingMode;
  stock: number;
  package: ShippingPackage;
}

/** Freight option as offered to the buyer (`buyerPriceCents` = 0 when free). */
export interface CheckoutShippingOption extends ShippingQuoteOption {
  buyerPriceCents: number;
}

export interface ProductShippingQuote {
  mode: ShippingMode;
  options: CheckoutShippingOption[];
  /** Set when no option can be offered for this destination. */
  unavailableReason?: string;
}

type PhysicalProductRow = {
  id: string;
  creator_id: string;
  type: string;
  title: string;
  status: string;
  price_cents: number;
  shipping_mode: string | null;
  stock: number | null;
  weight_grams: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
};

/** Loads a physical product with the service role (null if not physical). */
export async function loadPhysicalProduct(
  productId: string
): Promise<PhysicalProductContext | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("products")
    .select(
      "id, creator_id, type, title, status, price_cents, shipping_mode, stock, weight_grams, length_cm, width_cm, height_cm"
    )
    .eq("id", productId)
    .maybeSingle();

  const row = data as PhysicalProductRow | null;
  if (!row || row.type !== "physical") return null;
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    status: row.status,
    priceCents: row.price_cents,
    shippingMode: (row.shipping_mode as ShippingMode | null) ?? "buyer_pays",
    stock: row.stock ?? 0,
    package: {
      weightGrams: row.weight_grams ?? 0,
      lengthCm: row.length_cm ?? 0,
      widthCm: row.width_cm ?? 0,
      heightCm: row.height_cm ?? 0,
    },
  };
}

async function rawQuote(
  from: string,
  to: string,
  pkg: ShippingPackage,
  insuranceValueCents: number
): Promise<ShippingQuoteOption[]> {
  const gateway = getShippingGateway();
  const options = await gateway.quote({
    fromPostalCode: from,
    toPostalCode: to,
    package: pkg,
    insuranceValueCents,
    serviceIds: allowedServiceIds(),
  });
  return options.sort((a, b) => a.priceCents - b.priceCents);
}

/**
 * Freight options for a buyer's CEP, applying the product's shipping mode:
 * buyer_pays → every allowed service; free → only the cheapest, and only if
 * the creator still nets the minimum after paying it (R3).
 */
export async function quoteProductShipping(
  product: PhysicalProductContext,
  shipFrom: ShipFromAddress,
  toPostalCode: string
): Promise<ProductShippingQuote> {
  const options = await rawQuote(
    shipFrom.postalCode,
    toPostalCode,
    product.package,
    product.priceCents
  );

  if (!options.length) {
    return {
      mode: product.shippingMode,
      options: [],
      unavailableReason: "Nenhuma transportadora atende este CEP para este produto.",
    };
  }

  if (product.shippingMode === "free") {
    const cheapest = pickCheapestOption(options)!;
    if (
      !canOfferFreeShipping(
        product.priceCents,
        cheapest.priceCents,
        SALE_FEE_CONFIG,
        MIN_CREATOR_NET_CENTS
      )
    ) {
      return {
        mode: "free",
        options: [],
        unavailableReason: "Este produto não tem frete grátis para o seu CEP.",
      };
    }
    return { mode: "free", options: [{ ...cheapest, buyerPriceCents: 0 }] };
  }

  return {
    mode: "buyer_pays",
    options: options.map((option) => ({ ...option, buyerPriceCents: option.priceCents })),
  };
}

export interface ShippingEstimate {
  label: string;
  postalCode: string;
  freightCents: number | null;
  deliveryDays: number | null;
  /** Net on PIX for the creator from this sale (single withdraw). */
  creatorNetCents: number | null;
  viable: boolean;
}

/** Creator-side simulator for the product form (reference capitals). */
export async function estimateShippingForCreator(input: {
  shipFrom: ShipFromAddress;
  package: ShippingPackage;
  priceCents: number;
  mode: ShippingMode;
}): Promise<ShippingEstimate[]> {
  return Promise.all(
    REFERENCE_DESTINATIONS.map(async (destination) => {
      try {
        const options = await rawQuote(
          input.shipFrom.postalCode,
          destination.postalCode,
          input.package,
          input.priceCents
        );
        const cheapest = pickCheapestOption(options);
        if (!cheapest) {
          return { ...destination, freightCents: null, deliveryDays: null, creatorNetCents: null, viable: false };
        }
        const split = computePhysicalOrderSplit(
          { priceCents: input.priceCents, mode: input.mode, shippingCents: cheapest.priceCents },
          SALE_FEE_CONFIG
        );
        const viable =
          input.mode === "buyer_pays" ||
          canOfferFreeShipping(input.priceCents, cheapest.priceCents, SALE_FEE_CONFIG, MIN_CREATOR_NET_CENTS);
        return {
          ...destination,
          freightCents: cheapest.priceCents,
          deliveryDays: cheapest.deliveryDays,
          creatorNetCents: creatorWithdrawNetCents(split.creatorAmountCents),
          viable,
        };
      } catch {
        return { ...destination, freightCents: null, deliveryDays: null, creatorNetCents: null, viable: false };
      }
    })
  );
}
