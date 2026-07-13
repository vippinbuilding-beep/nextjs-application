import type { NextRequest } from "next/server";

import { claimProductSlug } from "@/lib/profile/slug-server";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ClaimSlugBody {
  desired?: string;
}

/** Atomically resolves an available product slug for the caller (scoped per creator). */
export async function POST(request: NextRequest) {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: ClaimSlugBody;
  try {
    body = (await request.json()) as ClaimSlugBody;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const desired = typeof body.desired === "string" ? body.desired : "";

  try {
    const slug = await claimProductSlug(user.id, desired);
    return Response.json({ slug });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao gerar slug.";
    return Response.json({ error: message }, { status: 500 });
  }
}
