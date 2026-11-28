import type { MetadataRoute } from "next";

import { toAbsoluteUrl } from "@/lib/metadata";
import { createSupabasePublicClient } from "@vippin/supabase/client/public";

/** Regenerated at most once per hour (cookieless client, so it can be cached). */
export const revalidate = 3600;

/** Sitemap protocol limit per file. */
const MAX_URLS = 50_000;

interface ProductRow {
  creator_id: string;
  slug: string;
  updated_at: string | null;
}

/**
 * Home, explorar, e só os criadores com pelo menos um produto ativo, com seus
 * produtos ativos. Lido como visitante deslogado (RLS: só `status = 'active'`).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: toAbsoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: toAbsoluteUrl("/explore"), changeFrequency: "daily", priority: 0.8 },
  ];

  try {
    const supabase = createSupabasePublicClient();
    const { data: products, error } = await supabase
      .from("products")
      .select("creator_id, slug, updated_at")
      .eq("status", "active")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .limit(MAX_URLS);
    if (error || !products?.length) return entries;

    const rows = products as ProductRow[];
    const creatorIds = [...new Set(rows.map((p) => p.creator_id))];
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, slug")
      .in("id", creatorIds);

    const slugById = new Map(
      ((profiles ?? []) as { id: string; slug: string | null }[])
        .filter((p) => p.slug)
        .map((p) => [p.id, p.slug as string])
    );

    // Criador: atualizado quando o produto mais recente dele mudou.
    const creatorLastModified = new Map<string, string>();
    for (const product of rows) {
      const current = creatorLastModified.get(product.creator_id);
      if (product.updated_at && (!current || product.updated_at > current)) {
        creatorLastModified.set(product.creator_id, product.updated_at);
      }
    }

    for (const [creatorId, slug] of slugById) {
      const lastModified = creatorLastModified.get(creatorId);
      entries.push({
        url: toAbsoluteUrl(`/@${slug}`),
        ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const product of rows) {
      const creatorSlug = slugById.get(product.creator_id);
      if (!creatorSlug || entries.length >= MAX_URLS) continue;
      entries.push({
        url: toAbsoluteUrl(`/@${creatorSlug}/${encodeURIComponent(product.slug)}`),
        ...(product.updated_at ? { lastModified: new Date(product.updated_at) } : {}),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // Sem banco (build local sem env): entrega só as páginas fixas.
  }

  return entries;
}
