import "server-only";

import type { Order } from "@vippin/core/models/order";
import {
  notifyProductAccessGranted,
  notifyProductFreeClaim,
  notifyProductPurchaseConfirmed,
  notifyProductSale,
  productPublicPath,
} from "@/lib/notifications/dispatch";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";

type ProductContext = {
  title: string;
  slug: string;
  creatorSlug: string;
};

type ProductContextRow = {
  title: string;
  slug: string;
  profiles: { slug: string | null };
};

async function fetchProductContext(productId: string): Promise<ProductContext | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("title, slug, profiles!inner(slug)")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as ProductContextRow;
  const creatorSlug = row.profiles.slug;
  if (!creatorSlug) return null;

  return {
    title: row.title,
    slug: row.slug,
    creatorSlug,
  };
}

async function fetchBuyerName(buyerId: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("consumer_name, name, display_name")
    .eq("id", buyerId)
    .maybeSingle();

  return (
    data?.consumer_name ??
    data?.name ??
    data?.display_name ??
    "Alguém"
  );
}

export async function sendOrderPaidNotifications(order: Order): Promise<void> {
  const product = await fetchProductContext(order.productId);
  if (!product) return;

  const productHref = productPublicPath(product.creatorSlug, product.slug);
  const buyerName = await fetchBuyerName(order.buyerId);

  await Promise.all([
    notifyProductPurchaseConfirmed({
      buyerId: order.buyerId,
      orderId: order.id,
      productId: order.productId,
      productTitle: product.title,
      productHref,
    }),
    notifyProductSale({
      creatorId: order.creatorId,
      orderId: order.id,
      productId: order.productId,
      productTitle: product.title,
      buyerName,
      amountCents: order.amountCents,
    }),
  ]);
}

export async function sendFreeProductAccessNotifications(input: {
  productId: string;
  buyerId: string;
  creatorId: string;
}): Promise<void> {
  const product = await fetchProductContext(input.productId);
  if (!product) return;

  const productHref = productPublicPath(product.creatorSlug, product.slug);
  const buyerName = await fetchBuyerName(input.buyerId);

  await Promise.all([
    notifyProductAccessGranted({
      buyerId: input.buyerId,
      productId: input.productId,
      productTitle: product.title,
      productHref,
    }),
    notifyProductFreeClaim({
      creatorId: input.creatorId,
      productId: input.productId,
      productTitle: product.title,
      buyerName,
    }),
  ]);
}

export async function fetchOrderProductLabel(
  productId: string
): Promise<string | null> {
  const product = await fetchProductContext(productId);
  return product?.title ?? null;
}
