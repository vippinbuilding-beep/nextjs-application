import type { NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cancels a product owned by the authenticated creator (soft delete: sets
 * status = 'cancelled'). No cascade — comments and buyer access history are
 * preserved, and the product becomes invisible to everyone except its owner.
 */
export async function DELETE(
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

  const admin = createSupabaseAdminClient();
  const { data: product, error: readError } = await admin
    .from("products")
    .select("id, creator_id")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return Response.json({ error: readError.message }, { status: 500 });
  }

  if (!product || product.creator_id !== user.id) {
    return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from("products")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("creator_id", user.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
