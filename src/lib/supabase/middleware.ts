import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildLoginUrl } from "@/lib/auth/login-url";
import { safeReturnPath } from "@/lib/auth/login-return";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Rotas que exigem usuário autenticado.
const PROTECTED_PREFIXES = ["/onboarding", "/products", "/profile", "/my-products", "/my-questions", "/painel"];

const CREATOR_ONLY_PREFIXES = ["/products", "/profile/links", "/profile/ask-me", "/painel"];

/**
 * Refreshes the Supabase auth session (rotating cookies) and enforces
 * server-side route protection. Must run in `middleware.ts`.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: `getUser()` revalidates the token against the Supabase Auth
  // server. Do not use `getSession()` here, as it trusts the cookie as-is.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!user && isProtected) {
    const returnPath = safeReturnPath(`${pathname}${request.nextUrl.search}`) ?? "/";
    const url = new URL(buildLoginUrl({ next: returnPath }), request.url);
    return NextResponse.redirect(url);
  }

  if (user) {
    const isCreatorOnlyRoute = CREATOR_ONLY_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );
    if (isCreatorOnlyRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "consumer") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
