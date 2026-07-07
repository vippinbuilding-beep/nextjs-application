import {
  avatarResponseHeaders,
  fetchPlatformProfileImage,
} from "@/lib/avatar-proxy";
import { resolveProfileLinkPreviewImage } from "@/lib/profile-link-preview";
import { normalizeProfileLinkUrl } from "@/lib/profile-links";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxies a resolved platform profile photo for live preview in the editor.
 * External CDNs (Instagram, etc.) block direct browser loads without Referer.
 */
export async function GET(request: Request) {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url")?.trim() ?? "";
  const normalized = normalizeProfileLinkUrl(rawUrl);

  if (!normalized) {
    return new Response("Bad request", { status: 400 });
  }

  try {
    const externalUrl = await resolveProfileLinkPreviewImage(normalized);
    if (!externalUrl) {
      return new Response("Not found", { status: 404 });
    }

    const upstream = await fetchPlatformProfileImage(externalUrl, normalized);
    if (!upstream.ok || !upstream.body) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: avatarResponseHeaders(
        upstream.headers.get("content-type") || "image/jpeg",
        upstream.headers.get("content-length")
      ),
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
