import type { NextRequest } from "next/server";

import { avatarResponseHeaders } from "@/lib/avatar-proxy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PROFILE_LINKS_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_TTL_SECONDS = 60;

/**
 * Streams a stored profile-link preview image. Public and cacheable — link
 * covers appear on creator public profiles.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: linkId } = await params;

  const admin = createSupabaseAdminClient();
  const { data: link } = await admin
    .from("profile_links")
    .select("image_path, image_mime")
    .eq("id", linkId)
    .maybeSingle();

  if (!link?.image_path) {
    return new Response("Not found", { status: 404 });
  }

  const { data: signed, error } = await admin.storage
    .from(PROFILE_LINKS_BUCKET)
    .createSignedUrl(link.image_path, SIGNED_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(signed.signedUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }

  const headers = avatarResponseHeaders(
    upstream.headers.get("content-type") || link.image_mime || "image/jpeg",
    upstream.headers.get("content-length")
  );

  return new Response(upstream.body, { status: 200, headers });
}
