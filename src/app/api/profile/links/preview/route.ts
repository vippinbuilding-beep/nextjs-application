import { resolveProfileLinkPreviewImage } from "@/lib/profile-link-preview";
import { normalizeProfileLinkUrl } from "@/lib/profile-links";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url")?.trim() ?? "";

  if (!normalizeProfileLinkUrl(rawUrl)) {
    return Response.json({ error: "URL inválida." }, { status: 400 });
  }

  try {
    const previewImageUrl = await resolveProfileLinkPreviewImage(rawUrl);
    return Response.json({ previewImageUrl });
  } catch {
    return Response.json(
      { error: "Não foi possível buscar a imagem do perfil." },
      { status: 500 }
    );
  }
}
