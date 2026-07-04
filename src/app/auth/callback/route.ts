import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler (server-side).
 *
 * Supabase redirects here after Google sign-in with a `code` query param.
 * We exchange it for a session server-side (setting httpOnly auth cookies) and
 * then redirect based on the user's onboarding status (honoring a safe `next`
 * path when present, e.g. to return the user to the product they were buying).
 */

/**
 * Only allow same-app, absolute paths as redirect targets. This prevents open
 * redirects (e.g. `//evil.com` or `https://evil.com`) via the `next` param.
 */
function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null;
  }
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));


  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const destination = profile?.onboarding_completed
    ? (next ?? "/")
    : "/onboarding";

  return NextResponse.redirect(`${origin}${destination}`);
}
