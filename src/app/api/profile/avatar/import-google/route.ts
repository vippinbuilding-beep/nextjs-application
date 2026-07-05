import type { NextRequest } from "next/server";

import { AVATAR_MAX_SIZE, extractGoogleAvatarUrl } from "@/lib/profile";
import { fetchExternalAvatar } from "@/lib/avatar-proxy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AVATARS_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Downloads the signed-in user's Google OAuth photo and stores it in the
 * avatars bucket. After this, the profile uses `avatar_path` only — no
 * external URL in the browser.
 */
export async function POST(request: NextRequest) {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  let force = false;
  try {
    const body = (await request.json()) as { force?: boolean };
    force = body.force === true;
  } catch {
    // Empty body is fine — default force=false.
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.avatar_path && !force) {
    return Response.json({
      path: profile.avatar_path,
      alreadyStored: true,
    });
  }

  const googleUrl = extractGoogleAvatarUrl(user.user_metadata);
  if (!googleUrl) {
    return Response.json(
      { error: "Nenhuma foto do Google disponível." },
      { status: 404 }
    );
  }

  const upstream = await fetchExternalAvatar(googleUrl);
  if (!upstream.ok) {
    return Response.json(
      { error: "Não foi possível baixar a foto do Google." },
      { status: upstream.status === 429 ? 429 : 502 }
    );
  }

  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength > AVATAR_MAX_SIZE) {
    return Response.json({ error: "Imagem muito grande." }, { status: 400 });
  }

  const contentType =
    upstream.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const path = `${user.id}/avatar-google.${extensionForMime(contentType)}`;

  const { error: uploadError } = await admin.storage
    .from(AVATARS_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    return Response.json(
      { error: uploadError.message ?? "Falha ao salvar a foto." },
      { status: 500 }
    );
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      avatar_path: path,
      avatar_mime: contentType,
      avatar_url: null,
    })
    .eq("id", user.id);

  if (updateError) {
    return Response.json(
      { error: updateError.message ?? "Falha ao atualizar o perfil." },
      { status: 500 }
    );
  }

  return Response.json({ path, mime: contentType });
}
