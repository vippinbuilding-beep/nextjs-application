import { extractGoogleAvatarUrl } from "@/lib/profile";
import {
  avatarResponseHeaders,
  fetchExternalAvatar,
} from "@/lib/avatar-proxy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxies the signed-in user's Google OAuth photo for onboarding preview.
 * The browser never hits googleusercontent.com directly (avoids 429 rate limits).
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const googleUrl = extractGoogleAvatarUrl(user.user_metadata);
  if (!googleUrl) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetchExternalAvatar(googleUrl);
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: upstream.status === 429 ? 429 : 404 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: avatarResponseHeaders(
      upstream.headers.get("content-type") || "image/jpeg",
      upstream.headers.get("content-length")
    ),
  });
}
