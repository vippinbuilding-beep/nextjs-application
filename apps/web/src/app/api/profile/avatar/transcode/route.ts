import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";
import { AVATARS_BUCKET } from "@/lib/supabase/storage";
import { transcodeStoredImageToWebp } from "@/lib/media/transcode-to-webp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  path?: string;
}

/**
 * Converts the caller's just-uploaded avatar to WebP in place (server-side).
 * The browser uploaded the original straight to Storage via a presigned URL;
 * this route swaps it for a smaller WebP, keeping animation. Best-effort: it
 * always returns a usable path, never breaking the upload.
 */
export async function POST(request: Request) {
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
  // Only the caller's own avatar folder — never touch someone else's object.
  if (!path || !path.startsWith(`${user.id}/`)) {
    return Response.json({ error: "Caminho inválido." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const result = await transcodeStoredImageToWebp(admin, AVATARS_BUCKET, path);
  return Response.json(result);
}
