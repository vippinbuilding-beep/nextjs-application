import type { NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { PRODUCTS_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Signed URL lifetime used internally to fetch the thumbnail bytes. */
const SIGNED_TTL_SECONDS = 60;
/**
 * How long clients (and the Next image optimizer) may cache the bytes. Safe to
 * keep long: the URL is versioned by `?v=<thumbnailPath>` (see
 * `getProductThumbnailUrl`), so a new upload always gets a fresh URL instead of
 * serving the stale cached image.
 */
const CACHE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Streams a product thumbnail through the server. Thumbnails are not sensitive
 * (they appear on public listing grids), so this route is open and cacheable.
 * We proxy the bytes rather than redirecting: the Next.js image optimizer does
 * not follow redirects, so a 302 would render as an empty/broken image.
 * Sensitive files use the gated `media` / `download` routes instead.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const admin = createSupabaseAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("thumbnail_path, thumbnail_mime")
    .eq("id", id)
    .maybeSingle();

  if (!product?.thumbnail_path) {
    return new Response("Not found", { status: 404 });
  }

  const { data: signed, error } = await admin.storage
    .from(PRODUCTS_BUCKET)
    .createSignedUrl(product.thumbnail_path, SIGNED_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(signed.signedUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set(
    "content-type",
    upstream.headers.get("content-type") ||
      product.thumbnail_mime ||
      "image/jpeg"
  );
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);
  headers.set(
    "cache-control",
    `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`
  );

  return new Response(upstream.body, { status: 200, headers });
}
