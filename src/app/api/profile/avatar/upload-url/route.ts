import type { NextRequest } from "next/server";

import { AVATAR_MAX_SIZE } from "@/lib/profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AVATARS_BUCKET, sanitizeFileName } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UploadUrlBody {
  fileName?: string;
  contentType?: string;
  size?: number;
}

/**
 * Issues a presigned upload URL for the caller's profile avatar.
 */
export async function POST(request: NextRequest) {
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

  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const size = typeof body.size === "number" ? body.size : 0;
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "";

  if (!fileName) {
    return Response.json({ error: "Nome de arquivo ausente." }, { status: 400 });
  }

  if (contentType && !contentType.startsWith("image/")) {
    return Response.json(
      { error: "A foto precisa ser uma imagem." },
      { status: 400 }
    );
  }

  if (size > AVATAR_MAX_SIZE) {
    return Response.json({ error: "Imagem muito grande." }, { status: 400 });
  }

  const safeName = sanitizeFileName(fileName);
  const path = `${user.id}/avatar-${safeName}`;

  const admin = createSupabaseAdminClient();
  const { data: signed, error } = await admin.storage
    .from(AVATARS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !signed) {
    return Response.json(
      { error: error?.message ?? "Falha ao gerar URL de upload." },
      { status: 500 }
    );
  }

  return Response.json({ path, token: signed.token });
}
