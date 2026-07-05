import type { NextRequest } from "next/server";

import { PROFILE_LINK_LIMITS } from "@/lib/profile-links";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROFILE_LINKS_BUCKET, sanitizeFileName } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UploadUrlBody {
  fileName?: string;
  contentType?: string;
  size?: number;
}

/**
 * Issues a presigned upload URL for a profile link cover image.
 * Only the link owner may upload.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: linkId } = await params;

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: link } = await server
    .from("profile_links")
    .select("id, creator_id")
    .eq("id", linkId)
    .maybeSingle();

  if (!link || link.creator_id !== user.id) {
    return Response.json({ error: "Link não encontrado." }, { status: 404 });
  }

  let body: UploadUrlBody;
  try {
    body = (await request.json()) as UploadUrlBody;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const size = typeof body.size === "number" ? body.size : 0;
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "";

  if (!fileName) {
    return Response.json({ error: "Nome de arquivo ausente." }, { status: 400 });
  }

  if (contentType && !contentType.startsWith("image/")) {
    return Response.json(
      { error: "A imagem precisa ser um arquivo de imagem." },
      { status: 400 }
    );
  }

  if (size > PROFILE_LINK_LIMITS.imageMaxSize) {
    return Response.json({ error: "Imagem muito grande." }, { status: 400 });
  }

  const safeName = sanitizeFileName(fileName);
  const path = `${user.id}/${linkId}/${safeName}`;

  const admin = createSupabaseAdminClient();
  const { data: signed, error } = await admin.storage
    .from(PROFILE_LINKS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !signed) {
    return Response.json(
      { error: error?.message ?? "Falha ao gerar URL de upload." },
      { status: 500 }
    );
  }

  return Response.json({ path, token: signed.token });
}
