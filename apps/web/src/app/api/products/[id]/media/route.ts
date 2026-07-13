import { NextResponse, type NextRequest } from "next/server";

import { verifyMediaToken } from "@/lib/security/media-token";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { PRODUCTS_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signed URL lifetime. Long enough to cover a full viewing session: the player
 * follows our 302 once and then issues Range requests straight to Storage, so
 * this TTL — not the media token — bounds how long playback/seeking keeps
 * working after the page loads.
 */
const SIGNED_TTL_SECONDS = 60 * 60 * 6;

/**
 * Gates access to a lesson video, then redirects (302) to a short-lived signed
 * Storage URL. Access is validated by a media token minted server-side when the
 * product page renders; the permanent storage path is never exposed.
 *
 * We redirect instead of proxy-streaming the bytes through Node: Supabase
 * Storage serves HTTP Range natively, so the browser seeks and buffers directly
 * against the CDN. Proxying through the server (previous approach) doubled the
 * bandwidth and, without forwarding the client's abort signal, left the video
 * stalling after a couple of seconds of buffer.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!verifyMediaToken(token, id, "media")) {
    return new Response("Forbidden", { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  if (!product?.file_path) {
    return new Response("Not found", { status: 404 });
  }

  const { data: signed, error } = await admin.storage
    .from(PRODUCTS_BUCKET)
    .createSignedUrl(product.file_path, SIGNED_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return new Response("Not found", { status: 404 });
  }

  // 302 (not 307/permanent): the signed URL is temporary and must not be cached
  // or reused as if it were the canonical resource location.
  const response = NextResponse.redirect(signed.signedUrl, { status: 302 });
  response.headers.set("cache-control", "private, no-store");
  return response;
}
