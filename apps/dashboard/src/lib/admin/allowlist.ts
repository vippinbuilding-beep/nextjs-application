import "server-only";

/**
 * Checagem da allowlist `admin_users` via chamada REST direta ao PostgREST do
 * Supabase, autenticada com a service role key.
 *
 * Por que `fetch` em vez do client `@supabase/supabase-js`: este módulo é usado
 * pelo middleware, que roda no Edge Runtime. O client admin do supabase-js
 * acessa APIs de Node (`process.version`) não suportadas no Edge. Um `fetch`
 * puro é Edge-safe e evita essa incompatibilidade.
 *
 * A tabela `admin_users` tem RLS ligado SEM policies, então só a service role
 * (que bypassa RLS) consegue lê-la — por isso usamos a service role key aqui.
 * `server-only` garante que este código nunca vá para o bundle do cliente.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function restHeaders(): HeadersInit {
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Set it in your " +
        "server environment (never expose it to the client)."
    );
  }
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

/**
 * Retorna `true` se o e-mail estiver na allowlist. Fail-closed: qualquer erro
 * de rede/leitura nega o acesso.
 */
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;

  try {
    const url = new URL(`${supabaseUrl}/rest/v1/admin_users`);
    url.searchParams.set("select", "id");
    url.searchParams.set("email", `eq.${email}`);
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      headers: restHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return false;

    const rows = (await res.json()) as unknown[];
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Marca o `user_id` do admin no primeiro login (auditoria + vínculo com
 * auth.users). Best-effort: falhas aqui não bloqueiam o login.
 */
export async function linkAdminUserId(email: string, userId: string): Promise<void> {
  const url = new URL(`${supabaseUrl}/rest/v1/admin_users`);
  url.searchParams.set("email", `eq.${email}`);
  url.searchParams.set("user_id", "is.null");

  await fetch(url, {
    method: "PATCH",
    headers: {
      ...restHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ user_id: userId }),
    cache: "no-store",
  });
}
