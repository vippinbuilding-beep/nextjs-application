import "server-only";

import { computePhysicalOrderSplit } from "@vippin/core/domain/shipping";
import { onlyDigits } from "@vippin/core/domain/br-documents";
import type { ShippingAddress } from "@vippin/core/models/shipping";
import { SALE_FEE_CONFIG, canSellPhysical } from "@/lib/shipping/config";
import { loadPhysicalProduct, quoteProductShipping } from "@/lib/shipping/quote";
import { getShipFrom, validateAddressFields } from "@/lib/shipping/ship-from";
import { getOrderRepository, getPaymentGateway } from "@vippin/supabase/factories/payment-factory";

const CHARGE_TTL_SECONDS = 60 * 60;

export interface PhysicalCheckoutResult {
  status: number;
  body: Record<string, unknown>;
}

function fail(status: number, error: string): PhysicalCheckoutResult {
  return { status, body: { error } };
}

/** Parses the buyer's delivery data from the checkout body. */
export function parseShipToInput(
  raw: unknown,
  fallbackEmail?: string | null
): { value: ShippingAddress } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Informe o endereço de entrega." };
  const r = raw as Record<string, unknown>;
  const str = (key: string) => (typeof r[key] === "string" ? (r[key] as string).trim() : "");
  const value: ShippingAddress = {
    name: str("name"),
    document: onlyDigits(str("document")),
    phone: onlyDigits(str("phone")),
    email: fallbackEmail ?? undefined,
    postalCode: onlyDigits(str("postalCode")),
    street: str("street"),
    number: str("number"),
    complement: str("complement") || undefined,
    district: str("district"),
    city: str("city"),
    state: str("state").toUpperCase(),
  };
  const error = validateAddressFields(value, "destinatário");
  return error ? { error } : { value };
}

/**
 * Opens the PIX charge for a physical product. The freight is re-quoted here
 * (never trusted from the client), the split follows the product's shipping
 * mode, and the order is born `transfer_status = held` (escrow).
 */
export async function createPhysicalCheckout(input: {
  productId: string;
  buyerId: string;
  buyerEmail?: string | null;
  body: unknown;
}): Promise<PhysicalCheckoutResult> {
  const product = await loadPhysicalProduct(input.productId);
  if (!product || product.status !== "active") return fail(404, "Produto não encontrado.");
  if (product.creatorId === input.buyerId) {
    return fail(400, "Você não pode comprar o seu próprio produto.");
  }
  if (!canSellPhysical(product.creatorId)) {
    return fail(400, "Este produto ainda não está disponível para compra.");
  }
  if (product.stock <= 0) return fail(409, "Produto esgotado.");

  const body = (input.body ?? {}) as { shipTo?: unknown; serviceId?: unknown };
  const parsed = parseShipToInput(body.shipTo, input.buyerEmail);
  if ("error" in parsed) return fail(400, parsed.error);
  const shipTo = parsed.value;

  const serviceId = Number(body.serviceId);
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return fail(400, "Escolha uma opção de frete.");
  }

  const shipFrom = await getShipFrom(product.creatorId);
  if (!shipFrom) return fail(400, "O criador ainda não configurou o envio deste produto.");

  let quote;
  try {
    quote = await quoteProductShipping(product, shipFrom, shipTo.postalCode);
  } catch {
    return fail(502, "Não conseguimos calcular o frete agora. Tente novamente.");
  }
  if (quote.unavailableReason) return fail(400, quote.unavailableReason);

  const option = quote.options.find((o) => o.serviceId === serviceId);
  if (!option) {
    return fail(409, "A opção de frete mudou. Calcule o frete de novo.");
  }

  const split = computePhysicalOrderSplit(
    { priceCents: product.priceCents, mode: product.shippingMode, shippingCents: option.priceCents },
    SALE_FEE_CONFIG
  );

  const orders = getOrderRepository();
  const order = await orders.create({
    productId: product.id,
    buyerId: input.buyerId,
    creatorId: product.creatorId,
    amountCents: split.amountCents,
    platformFeeCents: split.platformFeeCents,
    creatorAmountCents: split.creatorAmountCents,
    shippingMode: product.shippingMode,
    shippingChargedCents: split.shippingChargedCents,
    shippingAbsorbedCents: split.shippingAbsorbedCents,
    shippingQuote: {
      serviceId: option.serviceId,
      serviceName: option.serviceName,
      company: option.company,
      priceCents: option.priceCents,
      deliveryDays: option.deliveryDays,
      quotedAt: new Date().toISOString(),
    },
    shipTo,
  });

  try {
    const charge = await getPaymentGateway().createPixCharge({
      amountCents: split.amountCents,
      description: product.title,
      expiresInSeconds: CHARGE_TTL_SECONDS,
      metadata: { orderId: order.id },
    });
    const updated = await orders.update(order.id, {
      abacateChargeId: charge.id,
      brCode: charge.brCode,
      brCodeBase64: charge.brCodeBase64,
      expiresAt: charge.expiresAt ?? null,
    });
    return {
      status: 200,
      body: {
        orderId: order.id,
        amountCents: split.amountCents,
        productCents: product.priceCents,
        shippingCents: split.shippingChargedCents,
        brCode: charge.brCode,
        brCodeBase64: charge.brCodeBase64,
        expiresAt: (updated?.expiresAt ?? charge.expiresAt)?.toISOString() ?? null,
      },
    };
  } catch (err) {
    await orders.update(order.id, { status: "failed" });
    return fail(502, err instanceof Error ? err.message : "Falha ao gerar a cobrança PIX.");
  }
}
