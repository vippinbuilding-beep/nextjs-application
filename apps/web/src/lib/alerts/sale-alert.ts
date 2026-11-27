import "server-only";

import { formatBRL } from "@vippin/core/domain/money";
import type { Order } from "@vippin/core/models/order";
import { sendDiscordMessage, type DiscordEmbed } from "@/lib/alerts/discord";
import { siteUrl } from "@/lib/shipping/config";
import { getProductThumbnailUrl, getProfileAvatarUrl } from "@/lib/supabase/storage";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";

/** Vippin primary yellow (#ffe502). */
const BRAND_COLOR = 0xffe502;
const TITLE_MAX = 256;
/** Brasília is UTC-3 all year (no DST since 2019). */
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

type SaleProductRow = {
  title: string;
  slug: string;
  thumbnail_path: string | null;
  profiles: {
    id: string;
    slug: string | null;
    display_name: string | null;
    name: string | null;
    avatar_path: string | null;
  } | null;
};

export interface SaleAnnouncement {
  orderId: string;
  paidAt: Date;
  productTitle: string;
  productUrl?: string | null;
  productImageUrl?: string | null;
  creatorName: string;
  creatorSlug?: string | null;
  creatorUrl?: string | null;
  creatorAvatarUrl?: string | null;
  amountCents: number;
  platformFeeCents: number;
  creatorAmountCents: number;
  shipping?: {
    mode: "buyer_pays" | "free";
    chargedCents: number;
    absorbedCents: number;
    destination?: string | null;
  };
  day?: { count: number; totalCents: number };
}

/** Pure: builds the Discord embed for one sale (also used by test scripts). */
export function buildSaleEmbed(sale: SaleAnnouncement): DiscordEmbed {
  const title = `💰 Nova venda: ${sale.productTitle}`;
  const fields: NonNullable<DiscordEmbed["fields"]> = [
    { name: "Total", value: formatBRL(sale.amountCents), inline: true },
    { name: "Taxa Vippin", value: formatBRL(sale.platformFeeCents), inline: true },
    { name: "Criador recebe", value: formatBRL(sale.creatorAmountCents), inline: true },
  ];

  if (sale.shipping) {
    fields.push(
      { name: "Tipo", value: "📦 Produto físico", inline: true },
      {
        name: "Frete",
        value:
          sale.shipping.mode === "free"
            ? `Grátis (${formatBRL(sale.shipping.absorbedCents)} do criador)`
            : `${formatBRL(sale.shipping.chargedCents)} pago pelo comprador`,
        inline: true,
      }
    );
    if (sale.shipping.destination) {
      fields.push({ name: "Destino", value: sale.shipping.destination, inline: true });
    }
  } else {
    fields.push({ name: "Tipo", value: "🎬 Produto digital", inline: true });
  }

  const footer = [
    sale.day ? `${sale.day.count}ª venda de hoje · ${formatBRL(sale.day.totalCents)} no dia` : null,
    `Pedido #${sale.orderId.slice(0, 8)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: title.length > TITLE_MAX ? `${title.slice(0, TITLE_MAX - 1)}…` : title,
    ...(sale.productUrl ? { url: sale.productUrl } : {}),
    color: BRAND_COLOR,
    author: {
      name: sale.creatorSlug ? `${sale.creatorName} (@${sale.creatorSlug})` : sale.creatorName,
      ...(sale.creatorUrl ? { url: sale.creatorUrl } : {}),
      ...(sale.creatorAvatarUrl ? { icon_url: sale.creatorAvatarUrl } : {}),
    },
    ...(sale.productImageUrl ? { image: { url: sale.productImageUrl } } : {}),
    fields,
    footer: { text: footer },
    timestamp: sale.paidAt.toISOString(),
  };
}

function startOfTodayBrt(now = new Date()): Date {
  const local = new Date(now.getTime() - BRT_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + BRT_OFFSET_MS);
}

async function salesToday(): Promise<{ count: number; totalCents: number } | undefined> {
  const { data, error } = await createSupabaseAdminClient()
    .from("orders")
    .select("amount_cents")
    .not("paid_at", "is", null)
    .gte("paid_at", startOfTodayBrt().toISOString());
  if (error || !data) return undefined;
  return {
    count: data.length,
    totalCents: data.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0),
  };
}

/**
 * Posts every paid sale to the team's sales channel on Discord. Called once
 * per order, right after the atomic `pending -> paid` transition. Carries no
 * buyer data beyond the destination city (physical orders).
 *
 * Images use the public thumbnail/avatar routes, so they only render when
 * NEXT_PUBLIC_SITE_URL points to a deployed, reachable site.
 */
export async function announceSale(order: Order): Promise<void> {
  if (!process.env.DISCORD_SALES_WEBHOOK_URL) return;
  try {
    const [{ data }, day] = await Promise.all([
      createSupabaseAdminClient()
        .from("products")
        .select(
          "title, slug, thumbnail_path, profiles(id, slug, display_name, name, avatar_path)"
        )
        .eq("id", order.productId)
        .maybeSingle(),
      salesToday(),
    ]);
    const product = data as unknown as SaleProductRow | null;
    const creator = product?.profiles ?? null;
    const creatorSlug = creator?.slug ?? null;

    const embed = buildSaleEmbed({
      orderId: order.id,
      paidAt: order.paidAt ?? new Date(),
      productTitle: product?.title ?? "Produto",
      productUrl:
        creatorSlug && product ? siteUrl(`/@${creatorSlug}/${product.slug}`) : null,
      productImageUrl: product?.thumbnail_path
        ? siteUrl(getProductThumbnailUrl(order.productId, product.thumbnail_path))
        : null,
      creatorName: creator?.display_name ?? creator?.name ?? "Criador",
      creatorSlug,
      creatorUrl: creatorSlug ? siteUrl(`/@${creatorSlug}`) : null,
      creatorAvatarUrl: creator?.avatar_path
        ? siteUrl(getProfileAvatarUrl(creator.id, creator.avatar_path))
        : null,
      amountCents: order.amountCents,
      platformFeeCents: order.platformFeeCents,
      creatorAmountCents: order.creatorAmountCents,
      shipping: order.shippingMode
        ? {
            mode: order.shippingMode,
            chargedCents: order.shippingChargedCents,
            absorbedCents: order.shippingAbsorbedCents,
            destination: order.shipTo
              ? `${order.shipTo.city}/${order.shipTo.state}`
              : null,
          }
        : undefined,
      day,
    });

    await sendDiscordMessage("sales", { embeds: [embed] });
  } catch (err) {
    console.error("[discord:sales] announce failed:", err instanceof Error ? err.message : err);
  }
}
