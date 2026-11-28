import "server-only";

import { postDeadline } from "@vippin/core/domain/fulfillment";
import { normalizeNfeKey, validateNfeKeyForSender } from "@vippin/core/domain/nfe-key";
import { DCE_DECLARATION_VERSION } from "@vippin/core/domain/seller-terms";
import { allowedDocumentTypes } from "@vippin/core/domain/seller-profile";
import { validateShippingPackage } from "@vippin/core/domain/shipping";
import type { Order } from "@vippin/core/models/order";
import type { Shipment, ShipmentDocumentType } from "@vippin/core/models/shipment";
import type { ShippingPackage } from "@vippin/core/models/shipping";
import { ShippingGatewayError } from "@vippin/core/shipping/shipping-gateway";
import { notifyShipmentLabelReady } from "@/lib/notifications/shipping-events";
import {
  applyFulfillmentEvent,
  recordShippingAdjustment,
  type EscrowActor,
} from "@/lib/payments/escrow";
import { alertBlockedLabel } from "@/lib/shipping/balance-alert";
import { documentRuleOptions, ESCROW_CONFIG, siteUrl } from "@/lib/shipping/config";
import { loadPhysicalProduct } from "@/lib/shipping/quote";
import { effectiveSellerProfile, getShipFrom } from "@/lib/shipping/ship-from";
import { getOrderRepository } from "@vippin/supabase/factories/payment-factory";
import {
  getShipmentRepository,
  getShippingGateway,
} from "@vippin/supabase/factories/shipping-factory";

export class PrepareShipmentError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "PrepareShipmentError";
  }
}

export interface PrepareShipmentInput {
  shipmentId: string;
  creatorId: string;
  documentType: ShipmentDocumentType;
  invoiceKey?: string;
  /** DC-e only: the creator ticked the content declaration (persisted with its version). */
  dceAccepted?: boolean;
  /** Real packed measures; defaults to the product's. */
  package?: ShippingPackage;
}

const STALE_LOCK_MS = 10 * 60 * 1000;

/** A `purchasing` lock left behind by a crashed attempt. */
export function isStalePurchasing(shipment: Shipment): boolean {
  return (
    shipment.status === "purchasing" &&
    Date.now() - shipment.updatedAt.getTime() > STALE_LOCK_MS
  );
}

function samePackage(a?: ShippingPackage, b?: ShippingPackage): boolean {
  if (!a || !b) return false;
  return (
    a.weightGrams === b.weightGrams &&
    a.lengthCm === b.lengthCm &&
    a.widthCm === b.widthCm &&
    a.heightCm === b.heightCm
  );
}

/** Friendly message for carrier errors (E8): never blame the creator for our wallet. */
function carrierErrorMessage(err: unknown): string {
  if (err instanceof ShippingGatewayError) {
    switch (err.code) {
      case "insufficient_balance":
      case "label_limit":
      case "unavailable":
        return "Não conseguimos gerar a etiqueta agora. Tente de novo em alguns minutos — a equipe Vippin já foi avisada.";
      case "not_configured":
        return "O envio ainda não está configurado na plataforma. Fale com o suporte.";
      case "invalid_data":
        return `A transportadora recusou os dados do envio: ${err.message}`;
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : "Falha ao gerar a etiqueta.";
}

/**
 * "Preparar envio": buys, generates and prints the label for one paid physical
 * order, using the platform's central Melhor Envio wallet. Idempotent and
 * locked via the shipment claim (pending/purchase_failed/canceled → purchasing),
 * so a double click never buys two labels. A label already paid in a previous
 * attempt (`purchased` with an id) is generated again instead of re-bought.
 */
export async function prepareShipment(
  input: PrepareShipmentInput
): Promise<{ order: Order; shipment: Shipment }> {
  const shipments = getShipmentRepository();
  const orders = getOrderRepository();
  const gateway = getShippingGateway();

  const shipment = await shipments.getById(input.shipmentId);
  if (!shipment || shipment.creatorId !== input.creatorId) {
    throw new PrepareShipmentError("Envio não encontrado.", 404);
  }
  const order = await orders.getById(shipment.orderId);
  if (!order || order.status !== "paid" || order.fulfillmentStatus !== "awaiting_shipment") {
    throw new PrepareShipmentError("Este pedido não está aguardando envio.", 409);
  }

  const [shipFrom, product] = await Promise.all([
    getShipFrom(input.creatorId),
    loadPhysicalProduct(order.productId),
  ]);
  if (!shipFrom) {
    throw new PrepareShipmentError("Cadastre seu endereço de remetente antes de preparar o envio.");
  }

  // Fiscal document (E3): allowed by the seller's profile (PF → DC-e, MEI →
  // NF-e/DC-e, Empresa → NF-e). Orders already paid always get a way out:
  // eligibility was checked before the sale.
  const allowed = allowedDocumentTypes(effectiveSellerProfile(shipFrom), documentRuleOptions());
  if (!allowed.includes(input.documentType)) {
    throw new PrepareShipmentError(
      input.documentType === "dce"
        ? "Seu perfil fiscal exige NF-e. Informe a chave da nota."
        : "Seu perfil fiscal (pessoa física) usa declaração de conteúdo."
    );
  }
  let invoiceKey: string | undefined;
  if (input.documentType === "nfe") {
    invoiceKey = normalizeNfeKey(input.invoiceKey ?? "");
    const keyError = validateNfeKeyForSender(invoiceKey, shipFrom);
    if (keyError) throw new PrepareShipmentError(keyError);
  } else if (!input.dceAccepted) {
    throw new PrepareShipmentError("Confirme a declaração de conteúdo para continuar.");
  }
  const documentFields = {
    documentType: input.documentType,
    invoiceKey: invoiceKey ?? null,
    dceAcceptedAt: input.documentType === "dce" ? new Date() : null,
    dceDeclarationVersion: input.documentType === "dce" ? DCE_DECLARATION_VERSION : null,
  };

  if (!product) throw new PrepareShipmentError("Produto não encontrado.", 404);
  if (!order.shipTo || !order.shippingQuote) {
    throw new PrepareShipmentError("Pedido sem endereço de entrega.", 409);
  }

  const pkg = input.package ?? shipment.package ?? product.package;
  if (!shipment.package && !input.package) {
    await shipments.update(shipment.id, { package: product.package });
  }
  const packageError = validateShippingPackage(pkg);
  if (packageError) throw new PrepareShipmentError(packageError);

  // A label already added to the cart in a previous attempt is resumed (never
  // bought twice). A `purchasing` lock older than STALE_LOCK_MS means that
  // attempt crashed (serverless timeout) and can be taken over.
  const stale = isStalePurchasing(shipment);
  const resumeLabel =
    Boolean(shipment.providerOrderId) &&
    (shipment.status === "purchased" || shipment.status === "purchase_failed" || stale);
  const claimFrom: Shipment["status"][] = resumeLabel
    ? [shipment.status]
    : stale
      ? ["purchasing"]
      : ["pending", "purchase_failed", "canceled"];
  const claimed = await shipments.claim(shipment.id, claimFrom, "purchasing", { error: null });
  if (!claimed) {
    throw new PrepareShipmentError("Este envio já está sendo preparado. Atualize a página.", 409);
  }

  const quotedCents = order.shippingQuote.priceCents;
  const packageChanged = !samePackage(pkg, product.package);
  let labelId: string | null = resumeLabel ? shipment.providerOrderId! : null;
  let costCents = shipment.costCents ?? 0;
  let paid = false;

  try {
    if (!labelId) {
      // Re-quote the chosen service with the real package (R5).
      if (packageChanged) {
        const requote = await gateway.quote({
          fromPostalCode: shipFrom.postalCode,
          toPostalCode: order.shipTo.postalCode,
          package: pkg,
          insuranceValueCents: product.priceCents,
          serviceIds: [order.shippingQuote.serviceId],
        });
        if (!requote.length) {
          throw new PrepareShipmentError(
            "O serviço escolhido pelo comprador não atende estas medidas. Revise o pacote."
          );
        }
      }

      const cart = await gateway.addToCart({
        serviceId: order.shippingQuote.serviceId,
        from: shipFrom,
        to: order.shipTo,
        items: [{ name: product.title, quantity: 1, unitaryValueCents: product.priceCents }],
        package: pkg,
        insuranceValueCents: product.priceCents,
        invoiceKey,
        externalId: order.id,
        externalUrl: siteUrl("/painel/envios"),
        reminder: `Vippin #${order.id.slice(0, 8)}`,
      });
      labelId = cart.id;
      costCents = cart.priceCents;
      // Persist right away so a crash before checkout can be resumed.
      await shipments.update(shipment.id, {
        providerOrderId: labelId,
        protocol: cart.protocol ?? null,
        costCents,
        ...documentFields,
        package: pkg,
      });
    }

    try {
      await gateway.checkout([labelId]);
    } catch (err) {
      // Resuming a label that was already paid: the platform answers 422.
      const alreadyPaid =
        resumeLabel &&
        err instanceof ShippingGatewayError &&
        /pag[oa]|paid/i.test(String(err.details ?? err.message));
      if (!alreadyPaid) {
        if (!resumeLabel) {
          await gateway.removeFromCart(labelId).catch(() => undefined);
          await shipments.update(shipment.id, { providerOrderId: null, costCents: null });
          labelId = null;
        }
        throw err;
      }
    }
    paid = true;
    await shipments.update(shipment.id, { purchasedAt: new Date() });

    await gateway.generate([labelId]);
    const tracking = await gateway.getTracking([labelId]).catch(() => ({}));
    const info = (tracking as Record<string, { trackingCode?: string; trackingUrl?: string }>)[labelId];

    const printedAt = new Date();
    const updatedShipment = await shipments.update(shipment.id, {
      status: "printed",
      providerOrderId: labelId,
      ...documentFields,
      package: pkg,
      labelPrintedAt: printedAt,
      trackingCode: info?.trackingCode ?? null,
      trackingUrl: info?.trackingUrl ?? null,
      error: null,
    });

    const actor: EscrowActor = { kind: "creator", userId: input.creatorId };
    const updatedOrder = await applyFulfillmentEvent(
      order,
      "label_ready",
      { shippingCostCents: costCents, postDeadlineAt: postDeadline(printedAt, ESCROW_CONFIG) },
      actor
    );

    // Ledger (R5): package change → creator; quote drift → platform.
    const diff = costCents - quotedCents;
    if (diff > 0) {
      await recordShippingAdjustment({
        order,
        kind: packageChanged ? "package_change" : "price_divergence",
        amountCents: diff,
        chargedTo: packageChanged ? "creator" : "platform",
        note: packageChanged
          ? "Medidas do pacote alteradas no preparo do envio."
          : "Etiqueta mais cara que a cotação do checkout.",
      });
    } else if (diff < 0) {
      await recordShippingAdjustment({
        order,
        kind: "price_divergence",
        amountCents: diff,
        chargedTo: "platform",
        note: "Etiqueta mais barata que a cotação do checkout.",
      });
    }

    const finalOrder = updatedOrder ?? (await orders.getById(order.id))!;
    await notifyShipmentLabelReady(finalOrder, info?.trackingCode);
    return { order: finalOrder, shipment: updatedShipment ?? shipment };
  } catch (err) {
    const message = carrierErrorMessage(err);
    await shipments.update(shipment.id, {
      // Paid → resume with "generate"; in cart but unpaid → resume checkout.
      status: paid ? "purchased" : "purchase_failed",
      error: err instanceof Error ? err.message.slice(0, 500) : message,
    });
    if (err instanceof PrepareShipmentError) throw err;
    if (err instanceof ShippingGatewayError) {
      console.error("[shipping] prepare failed:", err.code, err.message, err.details);
      // The creator is told "a equipe Vippin já foi avisada": make it true.
      await alertBlockedLabel(err, order.id);
    }
    throw new PrepareShipmentError(message, 502);
  }
}

/**
 * Creator cancels a label that wasn't posted yet (E7). The credit returns to
 * the wallet; the order goes back to "aguardando envio" (prepare deadline still
 * applies) so the creator can prepare it again.
 */
export async function cancelShipmentLabel(
  shipmentId: string,
  creatorId: string
): Promise<void> {
  const shipments = getShipmentRepository();
  const orders = getOrderRepository();
  const shipment = await shipments.getById(shipmentId);
  if (!shipment || shipment.creatorId !== creatorId) {
    throw new PrepareShipmentError("Envio não encontrado.", 404);
  }
  if (!shipment.providerOrderId || !["purchased", "printed"].includes(shipment.status)) {
    throw new PrepareShipmentError("Só dá para cancelar etiquetas ainda não postadas.", 409);
  }

  try {
    await getShippingGateway().cancel(shipment.providerOrderId, "Cancelada pelo remetente");
  } catch (err) {
    throw new PrepareShipmentError(carrierErrorMessage(err), 502);
  }

  await shipments.update(shipment.id, {
    status: "canceled",
    canceledAt: new Date(),
    providerOrderId: null,
    trackingCode: null,
    trackingUrl: null,
    costCents: null,
    labelPrintedAt: null,
  });

  const order = await orders.getById(shipment.orderId);
  if (order?.fulfillmentStatus === "label_ready") {
    await applyFulfillmentEvent(
      order,
      "label_canceled",
      { shippingCostCents: null, postDeadlineAt: null },
      { kind: "creator", userId: creatorId }
    );
  }
}
