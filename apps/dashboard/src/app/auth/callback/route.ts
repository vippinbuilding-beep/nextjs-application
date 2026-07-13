import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isAdminEmail, linkAdminUserId } from "@/lib/admin/allowlist";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = "force-dynamic";

function safeNext(next: string | null): string | null {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return null;
}

/**
 * Callback OAuth do dashboard (server-side).
 *
 * O dashboard roda em origin próprio (porta 3001 / subdomínio de admin), então
 * precisa da própria rota de callback — o `redirectTo` do login é montado a
 * partir de `window.location.origin`.
 *
 * Fluxo: troca o `code` por sessão (cookies httpOnly), confirma que o e-mail
 * está na allowlist `admin_users` (via service role) e redireciona para o
 * painel; se não estiver, manda para `/acesso-negado`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next")) ?? "/";

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
            // Route handlers podem escrever cookies; ignore se estiver read-only.
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

  const allowed = await isAdminEmail(user.email);
  if (!allowed) {
    // Sessão foi criada, mas o usuário não é admin. Assinar os cookies mesmo
    // assim para que o botão de logout em /acesso-negado funcione.
    const denied = NextResponse.redirect(`${origin}/acesso-negado`);
    pendingCookies.forEach(({ name, value, options }) => {
      denied.cookies.set(name, value, options);
    });
    return denied;
  }

  // Vincula o user_id na allowlist no primeiro login (best-effort).
  if (user.email) {
    try {
      await linkAdminUserId(user.email, user.id);
    } catch {
      // Não bloqueia o login — a autorização já foi confirmada por e-mail.
    }
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
