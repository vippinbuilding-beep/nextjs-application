import type { NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PROFILE_LINKS_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_TTL_SECONDS = 3600;

/**
 * Streams a profile link cover image through the server via a short-lived
 * signed URL from the private `profile-links` bucket.
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

  const upstream = await fetch(signed.signedUrl, {
    next: { revalidate: 300 },
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }

  const contentType =
    upstream.headers.get("content-type") ||
    link.image_mime ||
    "image/jpeg";

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      ...(upstream.headers.get("content-length")
        ? { "Content-Length": upstream.headers.get("content-length")! }
        : {}),
    },
  });
}
