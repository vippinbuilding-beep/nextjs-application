import type { NextRequest } from "next/server";

import { grantFreeProductAccess } from "@/lib/products/grant-free-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Grants access to a free product for the authenticated buyer.
 * Paid products must go through PIX checkout instead.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const result = await grantFreeProductAccess(id, user.id);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Não foi possível liberar o acesso.";
    const status = message === "Produto não encontrado." ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
