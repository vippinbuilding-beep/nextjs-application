import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildOnboardingUrl,
  safeReturnPath,
} from "@/lib/auth/login-return";
import { migrateLegacyGoogleAvatar } from "@/lib/profile/import-google-avatar";
import { ensureProfileForAuthUser } from "@/lib/profile/profile-write-server";
import { getProfileByUserId } from "@/lib/profile/server-profile";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = "force-dynamic";

/**
 * OAuth callback handler (server-side).
 *
 * Supabase redirects here after Google sign-in with a `code` query param.
 * We exchange it for a session server-side (setting httpOnly auth cookies) and
 * then redirect based on the user's onboarding status (honoring a safe `next`
 * path when present, e.g. to return the user to the product they were buying).
 */

function resolveSignupRole(roleParam: string | null): "creator" | "consumer" {
  return roleParam === "consumer" ? "consumer" : "creator";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeReturnPath(searchParams.get("next"));
  const signupRole = resolveSignupRole(searchParams.get("role"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const cookieStore = await cookies();
  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Route handlers can write cookies; ignore if the store is read-only.
          }
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

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

  let profile: { onboardingCompleted: boolean };
  try {
    const metadata = user.user_metadata ?? {};
    profile = await ensureProfileForAuthUser({
      userId: user.id,
      email: user.email,
      displayName:
        (metadata.full_name as string | undefined) ??
        (metadata.name as string | undefined) ??
        null,
      role: signupRole,
    });

    const row = await getProfileByUserId(user.id);
    await migrateLegacyGoogleAvatar({
      userId: user.id,
      metadata,
      avatarPath: row?.avatar_path,
      avatarUrl: row?.avatar_url,
    });
  } catch {
    return NextResponse.redirect(`${origin}/login`);
  }

  const destination = profile.onboardingCompleted
    ? (next ?? "/")
    : buildOnboardingUrl(next);

  const response = NextResponse.redirect(`${origin}${destination}`);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
