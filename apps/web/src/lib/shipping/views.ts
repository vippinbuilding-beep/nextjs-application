import "server-only";

import { FULFILLMENT_LABELS } from "@vippin/core/domain/fulfillment";
import {
  canRequestReturn,
  returnWindowEndsAt,
  type ReturnRequestStatus,
} from "@vippin/core/domain/returns";
import type { FulfillmentStatus, Order } from "@vippin/core/models/order";
import type { ShipmentStatus } from "@vippin/core/models/shipment";
import type { ShippingAddress, ShippingPackage } from "@vippin/core/models/shipping";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { getOrderRepository } from "@vippin/supabase/factories/payment-factory";
import {
  getOrderReturnRepository,
  getShipmentRepository,
} from "@vippin/supabase/factories/shipping-factory";
import { RETURN_WINDOW_DAYS } from "@/lib/shipping/config";
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
  /** Arrependimento: open/resolved request, if any. */
  returnStatus: ReturnRequestStatus | null;
  /** Buyer only: "Quero devolver" is available (within the window after delivery). */
  canRequestReturn: boolean;
  returnWindowEndsAt: string | null;
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
  const orderIds = orders.map((o) => o.id);
  const [initialShipments, products, returnRequests] = await Promise.all([
    shipmentRepo.listByOrderIds(orderIds),
    loadProducts([...new Set(orders.map((o) => o.productId))]),
    getOrderReturnRepository().listByOrderIds(orderIds),
  ]);
  const returnByOrder = new Map(returnRequests.map((r) => [r.orderId, r]));
  const now = new Date();
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
    const returnRequest = returnByOrder.get(order.id);
    const deliveredAt = shipment?.deliveredAt ?? null;
    const returnable =
      order.status === "paid" &&
      (status === "delivered" || (status === "released" && order.transferStatus === "pending"));
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
      returnStatus: returnRequest?.status ?? null,
      canRequestReturn:
        audience === "buyer" &&
        !returnRequest &&
        returnable &&
        canRequestReturn(deliveredAt, now, RETURN_WINDOW_DAYS),
      returnWindowEndsAt: deliveredAt
        ? returnWindowEndsAt(deliveredAt, RETURN_WINDOW_DAYS).toISOString()
        : null,
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
