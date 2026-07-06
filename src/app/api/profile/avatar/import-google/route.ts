import type { NextRequest } from "next/server";

import { importGoogleAvatarForUser } from "@/lib/profile/import-google-avatar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const result = await importGoogleAvatarForUser({
    userId: user.id,
    metadata: user.user_metadata,
    force,
  });

  switch (result.status) {
    case "already_stored":
      return Response.json({
        path: result.path,
        alreadyStored: true,
        avatarFromGoogle: true,
      });
    case "imported":
      return Response.json({
        path: result.path,
        mime: result.mime,
        avatarFromGoogle: true,
      });
    case "no_source":
      return Response.json(
        { error: "Nenhuma foto do Google disponível." },
        { status: 404 }
      );
    case "fetch_failed":
      return Response.json(
        { error: "Não foi possível baixar a foto do Google." },
        { status: result.httpStatus === 429 ? 429 : 502 }
      );
    case "too_large":
      return Response.json({ error: "Imagem muito grande." }, { status: 400 });
    case "storage_failed":
      return Response.json(
        { error: result.message ?? "Falha ao salvar a foto." },
        { status: 500 }
      );
    case "profile_failed":
      return Response.json(
        { error: result.message ?? "Falha ao atualizar o perfil." },
        { status: 500 }
      );
  }
}
