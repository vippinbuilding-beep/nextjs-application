import type { NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";
import { PRODUCTS_BUCKET } from "@/lib/supabase/storage";
import { transcodeStoredImageToWebp } from "@/lib/media/transcode-to-webp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  path?: string;
}

/**
 * Converts a product's just-uploaded thumbnail to WebP in place (server-side).
 * Mirrors the avatar transcode route: presigned upload happens first, then this
 * swaps the original for a smaller WebP. Best-effort — always returns a usable
 * path so a conversion failure never breaks the save.
 */
export async function POST(
  request: NextRequest,
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

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const path = typeof body.path === "string" ? body.path : "";
  // Path must sit under this owner + product: `${user.id}/${id}/...`.
  if (!path || !path.startsWith(`${user.id}/${id}/`)) {
    return Response.json({ error: "Caminho inválido." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("creator_id")
    .eq("id", id)
    .maybeSingle();
  if (!product || product.creator_id !== user.id) {
    return Response.json({ error: "Produto não encontrado." }, { status: 403 });
  }

  const result = await transcodeStoredImageToWebp(admin, PRODUCTS_BUCKET, path);
  return Response.json(result);
}
