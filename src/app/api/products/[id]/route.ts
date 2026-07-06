import type { NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PRODUCTS_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function deleteProductStorage(
  creatorId: string,
  productId: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const folder = `${creatorId}/${productId}`;

  const { data, error } = await admin.storage.from(PRODUCTS_BUCKET).list(folder);
  if (error) {
    console.error("[products] failed to list storage files:", error.message);
    return;
  }

  if (!data?.length) return;

  const paths = data.map((file) => `${folder}/${file.name}`);
  const { error: removeError } = await admin.storage
    .from(PRODUCTS_BUCKET)
    .remove(paths);

  if (removeError) {
    console.error("[products] failed to remove storage files:", removeError.message);
  }
}

/** Deletes a product owned by the authenticated creator (DB row + storage files). */
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

  await deleteProductStorage(product.creator_id, id);

  const { error: deleteError } = await admin
    .from("products")
    .delete()
    .eq("id", id)
    .eq("creator_id", user.id);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
