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

function resolveSignupRole(roleParam: string | null): "creator" | "consumer" {
  return roleParam === "consumer" ? "consumer" : "creator";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const signupRole = resolveSignupRole(searchParams.get("role"));

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

  let { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const metadata = user.user_metadata ?? {};
    const displayName =
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      null;
    const avatarUrl =
      (metadata.picture as string | undefined) ??
      (metadata.avatar_url as string | undefined) ??
      null;

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        display_name: displayName,
        avatar_url: avatarUrl,
        role: signupRole,
        onboarding_completed: false,
      })
      .select("onboarding_completed")
      .single();

    if (insertError) {
      return NextResponse.redirect(`${origin}/login`);
    }

    profile = created;
  }

  const destination = profile?.onboarding_completed
    ? (next ?? "/")
    : "/onboarding";

  return NextResponse.redirect(`${origin}${destination}`);
}
