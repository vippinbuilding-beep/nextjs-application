import type { NextRequest } from "next/server";

import {
  avatarResponseHeaders,
  fetchExternalAvatar,
} from "@/lib/avatar-proxy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AVATARS_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_TTL_SECONDS = 60;

/**
 * Streams a creator avatar through the server. Uploaded avatars are fetched
 * from Storage; external URLs (e.g. Google OAuth default) are proxied so the
 * browser never hits third-party hosts directly.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_path, avatar_mime, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  if (profile.avatar_path) {
    const { data: signed, error } = await admin.storage
      .from(AVATARS_BUCKET)
      .createSignedUrl(profile.avatar_path, SIGNED_TTL_SECONDS);

    if (error || !signed?.signedUrl) {
      return new Response("Not found", { status: 404 });
    }

    const upstream = await fetch(signed.signedUrl, {
      next: { revalidate: 300 },
    });
    if (!upstream.ok || !upstream.body) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: avatarResponseHeaders(
        upstream.headers.get("content-type") ||
          profile.avatar_mime ||
          "image/jpeg",
        upstream.headers.get("content-length")
      ),
    });
  }

  if (profile.avatar_url) {
    const upstream = await fetchExternalAvatar(profile.avatar_url);
    if (!upstream.ok || !upstream.body) {
      return new Response("Not found", {
        status: upstream.status === 429 ? 429 : 404,
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: avatarResponseHeaders(
        upstream.headers.get("content-type") || "image/jpeg",
        upstream.headers.get("content-length")
      ),
    });
  }

  return new Response("Not found", { status: 404 });
}
