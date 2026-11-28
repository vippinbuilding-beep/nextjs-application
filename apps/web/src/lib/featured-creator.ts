import "server-only";

import { unstable_cache } from "next/cache";

import type { ProductType } from "@vippin/core/models/product";
import { createSupabasePublicClient } from "@vippin/supabase/client/public";

import { hasProfileAvatar } from "@/lib/profile";
import { getProductThumbnailUrl, getProfileAvatarUrl } from "@/lib/supabase/storage";

/**
 * Criador em destaque na vitrine animada da landing. Os dados vêm do perfil
 * público dele (foto, nome, bio, "Pergunte para mim" e produtos ativos), com
 * cache de 10 minutos compartilhado entre visitantes: mudou a foto ou o nome
 * na Vippin, a landing acompanha sozinha.
 */
export const FEATURED_CREATOR_SLUG = "yanstedan";

const REVALIDATE_SECONDS = 600;
const MAX_PRODUCTS = 2;

export interface FeaturedCreator {
  slug: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  /** Preço do "Pergunte para mim", se estiver ativo. */
  askMePriceCents: number | null;
  /** Até dois produtos ativos, mais recentes primeiro. */
  products: {
    id: string;
    title: string;
    priceCents: number;
    type: ProductType;
    thumbnailUrl: string | null;
  }[];
}

async function loadFeaturedCreator(): Promise<FeaturedCreator | null> {
  const supabase = createSupabasePublicClient();
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, slug, creator_name, name, avatar_path, avatar_url, bio, ask_me_enabled, ask_me_price_cents")
    .eq("slug", FEATURED_CREATOR_SLUG)
    .maybeSingle();
  if (!profile) return null;

  const { data: products } = await supabase
    .from("products")
    .select("id, title, price_cents, type, thumbnail_path")
    .eq("creator_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(MAX_PRODUCTS);

  const avatar = { avatarPath: profile.avatar_path, avatarUrl: profile.avatar_url };

  return {
    slug: profile.slug,
    name: profile.creator_name ?? profile.name ?? profile.slug,
    bio: profile.bio ?? null,
    avatarUrl: hasProfileAvatar(avatar)
      ? getProfileAvatarUrl(profile.id, profile.avatar_path ?? profile.avatar_url)
      : null,
    askMePriceCents:
      profile.ask_me_enabled && typeof profile.ask_me_price_cents === "number"
        ? profile.ask_me_price_cents
        : null,
    products: (products ?? []).map((product) => ({
      id: product.id,
      title: product.title,
      priceCents: product.price_cents,
      type: product.type as ProductType,
      thumbnailUrl: product.thumbnail_path
        ? getProductThumbnailUrl(product.id, product.thumbnail_path)
        : null,
    })),
  };
}

export const getFeaturedCreator = unstable_cache(
  async () => {
    try {
      return await loadFeaturedCreator();
    } catch {
      // Sem destaque a landing mostra o exemplo genérico; nunca quebra a página.
      return null;
    }
  },
  ["landing-featured-creator", FEATURED_CREATOR_SLUG],
  { revalidate: REVALIDATE_SECONDS }
);
