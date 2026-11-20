import "server-only";

import { FULFILLMENT_LABELS } from "@vippin/core/domain/fulfillment";
import type { FulfillmentStatus, Order } from "@vippin/core/models/order";
import type { ShipmentStatus } from "@vippin/core/models/shipment";
import type { ShippingAddress, ShippingPackage } from "@vippin/core/models/shipping";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { getOrderRepository } from "@vippin/supabase/factories/payment-factory";
import { getShipmentRepository } from "@vippin/supabase/factories/shipping-factory";
import { isStalePurchasing } from "@/lib/shipping/prepare-shipment";

/** JSON-safe row for the creator "Envios" panel and the buyer "Meus pedidos". */
export interface PhysicalOrderView {
  orderId: string;
  shipmentId: string | null;
  productId: string;
  productTitle: string;
  productHref: string | null;
  fulfillmentStatus: FulfillmentStatus;
  statusLabel: string;
  shipmentStatus: ShipmentStatus | null;
  amountCents: number;
  creatorAmountCents: number;
  shippingMode: "buyer_pays" | "free" | null;
  shippingChargedCents: number;
  shippingAbsorbedCents: number;
  serviceName: string | null;
  company: string | null;
  deliveryDays: number | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  paidAt: string | null;
  prepareDeadlineAt: string | null;
  postDeadlineAt: string | null;
  deliveredAt: string | null;
  error: string | null;
  canPrepare: boolean;
  canPrint: boolean;
  canCancelLabel: boolean;
  /** Creator only. */
  shipTo?: ShippingAddress;
  package?: ShippingPackage;
}

type ProductInfo = { id: string; title: string; slug: string; creatorSlug: string | null };

async function loadProducts(ids: string[]): Promise<Map<string, ProductInfo>> {
  if (!ids.length) return new Map();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("products")
    .select("id, title, slug, profiles!inner(slug)")
    .in("id", ids);
  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    slug: string;
    profiles: { slug: string | null };
  }[];
  return new Map(
    rows.map((row) => [
      row.id,
      { id: row.id, title: row.title, slug: row.slug, creatorSlug: row.profiles?.slug ?? null },
    ])
  );
}

async function buildViews(orders: Order[], audience: "creator" | "buyer"): Promise<PhysicalOrderView[]> {
  const shipmentRepo = getShipmentRepository();
  const [initialShipments, products] = await Promise.all([
    shipmentRepo.listByOrderIds(orders.map((o) => o.id)),
    loadProducts([...new Set(orders.map((o) => o.productId))]),
  ]);
  const shipments = [...initialShipments];
  if (audience === "creator") {
    // Self-heal: a paid order whose shipment row wasn't created (crash right
    // after entering escrow) still gets a "Preparar envio" button.
    const known = new Set(shipments.map((s) => s.orderId));
    for (const order of orders) {
      if (order.fulfillmentStatus === "awaiting_shipment" && !known.has(order.id)) {
        shipments.push(
          await shipmentRepo.createForOrder({
            orderId: order.id,
            creatorId: order.creatorId,
            buyerId: order.buyerId,
            serviceId: order.shippingQuote?.serviceId,
            company: order.shippingQuote?.company,
          })
        );
      }
    }
  }
  const shipmentByOrder = new Map(shipments.map((s) => [s.orderId, s]));

  return orders.map((order) => {
    const shipment = shipmentByOrder.get(order.id);
    const product = products.get(order.productId);
    const status = order.fulfillmentStatus;
    const labelOpen =
      Boolean(shipment?.providerOrderId) &&
      (shipment?.status === "printed" || shipment?.status === "purchased");

    return {
      orderId: order.id,
      shipmentId: shipment?.id ?? null,
      productId: order.productId,
      productTitle: product?.title ?? "Produto",
      productHref:
        product?.creatorSlug ? `/@${product.creatorSlug}/${product.slug}` : null,
      fulfillmentStatus: status,
      statusLabel: FULFILLMENT_LABELS[status],
      shipmentStatus: shipment?.status ?? null,
      amountCents: order.amountCents,
      creatorAmountCents: order.creatorAmountCents,
      shippingMode: order.shippingMode ?? null,
      shippingChargedCents: order.shippingChargedCents,
      shippingAbsorbedCents: order.shippingAbsorbedCents,
      serviceName: order.shippingQuote?.serviceName ?? null,
      company: order.shippingQuote?.company ?? null,
      deliveryDays: order.shippingQuote?.deliveryDays ?? null,
      trackingCode: shipment?.trackingCode ?? null,
      trackingUrl: shipment?.trackingUrl ?? null,
      paidAt: order.paidAt?.toISOString() ?? null,
      prepareDeadlineAt: order.prepareDeadlineAt?.toISOString() ?? null,
      postDeadlineAt: order.postDeadlineAt?.toISOString() ?? null,
      deliveredAt: shipment?.deliveredAt?.toISOString() ?? null,
      error: audience === "creator" ? (shipment?.error ?? null) : null,
      canPrepare:
        audience === "creator" &&
        status === "awaiting_shipment" &&
        Boolean(shipment) &&
        (shipment!.status !== "purchasing" || isStalePurchasing(shipment!)),
      canPrint: audience === "creator" && status === "label_ready" && labelOpen,
      canCancelLabel: audience === "creator" && status === "label_ready" && labelOpen,
      ...(audience === "creator"
        ? { shipTo: order.shipTo, package: shipment?.package }
        : {}),
    };
  });
}

export async function listCreatorShipmentViews(creatorId: string): Promise<PhysicalOrderView[]> {
  const orders = await getOrderRepository().listPhysicalByCreator(creatorId);
  return buildViews(orders, "creator");
}

export async function listBuyerOrderViews(buyerId: string): Promise<PhysicalOrderView[]> {
  const orders = await getOrderRepository().listPhysicalByBuyer(buyerId);
  return buildViews(orders, "buyer");
}
