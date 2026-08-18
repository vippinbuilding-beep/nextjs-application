import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isAdminEmail } from "@/lib/admin/allowlist";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// TEMP DEBUG: log das variáveis suspeitas de causar o SSL handshake failure
// contra o Supabase. Não loga segredos por completo (só presença/tamanho).
// Roda uma vez por cold start do isolate (escopo de módulo). Remover depois
// de diagnosticar.
console.log("[middleware:dashboard] debug env", {
  supabaseUrl,
  supabaseAnonKeyLen: supabaseAnonKey?.length ?? 0,
  supabaseAnonKeyPrefix: supabaseAnonKey?.slice(0, 6) ?? null,
  serviceRoleKeySet: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  serviceRoleKeyLen: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
  vercelEnv: process.env.VERCEL_ENV,
  vercelRegion: process.env.VERCEL_REGION,
  vercelUrl: process.env.VERCEL_URL,
});

// Rotas públicas do dashboard (não exigem sessão nem allowlist).
const PUBLIC_PREFIXES = ["/login", "/auth/callback", "/acesso-negado"];

/**
 * Revalida a sessão do Supabase (rotacionando cookies) e faz o gate de
 * autorização do dashboard: só e-mails na allowlist `admin_users` acessam as
 * rotas internas.
 *
 * A checagem da allowlist usa o service role (via `isAdminEmail`), porque a
 * tabela `admin_users` tem RLS sem policies — o client de sessão não a lê.
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

  // IMPORTANT: `getUser()` revalida o token contra o Auth server. Não usar
  // `getSession()` aqui, que confia no cookie como está.
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  // TEMP DEBUG: getUser() normalmente retorna `{error}` em vez de lançar,
  // então aqui é o único lugar em que o detalhe da falha de SSL apareceria.
  if (getUserError) {
    console.error("[middleware:dashboard] getUser() error", getUserError);
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublic) {
    return response;
  }

  // Não autenticado → login.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Autenticado mas fora da allowlist → acesso negado.
  const allowed = await isAdminEmail(user.email);
  if (!allowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/acesso-negado";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
