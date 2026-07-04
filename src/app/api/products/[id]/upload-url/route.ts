import type { NextRequest } from "next/server";

import type { ProductType } from "@/core/models/product";
import { getProductTypeConfig, THUMBNAIL_MAX_SIZE } from "@/lib/products";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PRODUCTS_BUCKET, sanitizeFileName } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UploadUrlBody {
  kind?: "file" | "thumbnail";
  fileName?: string;
  contentType?: string;
  size?: number;
}

/**
 * Issues a presigned upload URL for a product file or thumbnail.
 *
 * The browser never uploads with broad credentials: it asks this route (which
 * verifies the caller is the product's owner and that the file respects the
 * size/type limits), then uploads straight to Storage with the returned
 * single-use token via `uploadToSignedUrl`. The service role stays server-side.
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

  let body: UploadUrlBody;
  try {
    body = (await request.json()) as UploadUrlBody;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const kind = body.kind === "thumbnail" ? "thumbnail" : "file";
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const size = typeof body.size === "number" ? body.size : 0;
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "";

  if (!fileName) {
    return Response.json({ error: "Nome de arquivo ausente." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("id, creator_id, type")
    .eq("id", id)
    .maybeSingle();

  if (!product || product.creator_id !== user.id) {
    return Response.json({ error: "Produto não encontrado." }, { status: 403 });
  }

  // Server-side size/type guard (client validation is just UX).
  if (kind === "thumbnail") {
    if (contentType && !contentType.startsWith("image/")) {
      return Response.json(
        { error: "A miniatura precisa ser uma imagem." },
        { status: 400 }
      );
    }
    if (size > THUMBNAIL_MAX_SIZE) {
      return Response.json({ error: "Imagem muito grande." }, { status: 400 });
    }
  } else {
    const config = getProductTypeConfig(product.type as ProductType);
    if (size > config.maxSize) {
      return Response.json({ error: "Arquivo muito grande." }, { status: 400 });
    }
  }

  const safeName = sanitizeFileName(fileName);
  const path =
    kind === "thumbnail"
      ? `${user.id}/${id}/thumbnail-${safeName}`
      : `${user.id}/${id}/${safeName}`;

  const { data: signed, error } = await admin.storage
    .from(PRODUCTS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !signed) {
    return Response.json(
      { error: error?.message ?? "Falha ao gerar URL de upload." },
      { status: 500 }
    );
  }

  return Response.json({ path, token: signed.token });
}
