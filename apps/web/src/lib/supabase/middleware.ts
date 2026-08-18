import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildLoginUrl } from "@/lib/auth/login-url";
import { safeReturnPath } from "@/lib/auth/login-return";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// TEMP DEBUG: log das variáveis suspeitas de causar o SSL handshake failure
// contra o Supabase. Não loga segredos por completo (só presença/tamanho).
// Roda uma vez por cold start do isolate (escopo de módulo). Remover depois
// de diagnosticar.
console.log("[middleware:web] debug env", {
  supabaseUrl,
  supabaseAnonKeyLen: supabaseAnonKey?.length ?? 0,
  supabaseAnonKeyPrefix: supabaseAnonKey?.slice(0, 6) ?? null,
  vercelEnv: process.env.VERCEL_ENV,
  vercelRegion: process.env.VERCEL_REGION,
  vercelUrl: process.env.VERCEL_URL,
});

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
    error: getUserError,
  } = await supabase.auth.getUser();

  // TEMP DEBUG: getUser() normally returns `{error}` instead of throwing, so
  // this is the only place the SSL handshake failure detail would surface.
  if (getUserError) {
    console.error("[middleware:web] getUser() error", getUserError);
  }

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
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      // TEMP DEBUG
      if (profileError) {
        console.error("[middleware:web] profiles query error", profileError);
      }

      if (profile?.role === "consumer") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
