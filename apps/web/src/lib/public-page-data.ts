import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@vippin/supabase/client/server";

/**
 * Loaders das páginas públicas (vitrine e produto), deduplicados por request
 * com `cache` do React: `generateMetadata` e a página pedem os mesmos dados e
 * só uma consulta vai ao banco. Cada ida ao Supabase custa uma viagem de rede,
 * então evitar repetidas é o que mais acelera a navegação.
 */

const PROFILE_COLUMNS =
  "id, creator_name, name, slug, socials, avatar_path, avatar_url, ask_me_enabled, ask_me_price_cents, bio, profile_default_tab";

const STOREFRONT_PRODUCT_COLUMNS =
  "id, type, title, description, price_cents, slug, thumbnail_path, thumbnail_width, thumbnail_height, media_width, media_height";

export const getRequestSupabase = cache(() => createSupabaseServerClient());

export const getRequestUser = cache(async () => {
  const supabase = await getRequestSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getPublicProfile = cache(async (slug: string) => {
  const supabase = await getRequestSupabase();
  const { data } = await supabase
    .from("public_profiles")
    .select(PROFILE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  return data;
});

export const getCreatorProduct = cache(async (creatorId: string, productSlug: string) => {
  const supabase = await getRequestSupabase();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("slug", productSlug)
    .maybeSingle();
  return data;
});

export const getActiveCreatorProducts = cache(async (creatorId: string) => {
  const supabase = await getRequestSupabase();
  const { data } = await supabase
    .from("products")
    .select(STOREFRONT_PRODUCT_COLUMNS)
    .eq("creator_id", creatorId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return data ?? [];
});

/** Slug da URL (`/@slug`, com ou sem `@`, codificado ou não). */
export function parseCreatorSlug(raw: string): string {
  return decodeURIComponent(raw).replace(/^@/, "");
}
