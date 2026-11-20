import "server-only";

import type { User as AuthUser } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@vippin/supabase/client/server";

export type RouteAuthResult =
  | { user: AuthUser; error?: undefined }
  | { user?: undefined; error: Response };

/** Authenticated user for a Route Handler, or a ready 401 response. */
export async function requireRouteUser(): Promise<RouteAuthResult> {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return { error: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { user };
}

/** Authenticated creator (role != consumer), or a ready 401/403 response. */
export async function requireRouteCreator(): Promise<RouteAuthResult> {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return { error: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  const { data: profile } = await server
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "consumer") {
    return { error: Response.json({ error: "Acesso negado." }, { status: 403 }) };
  }
  return { user };
}
