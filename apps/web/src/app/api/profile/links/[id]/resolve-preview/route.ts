import {
  clearProfileLinkStoredImage,
  storeProfileLinkPreview,
} from "@/lib/profile-link-preview-storage";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
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

  const { data: link, error: linkError } = await server
    .from("profile_links")
    .select("id, creator_id, url")
    .eq("id", linkId)
    .maybeSingle();

  if (linkError) {
    return Response.json({ error: linkError.message }, { status: 500 });
  }

  if (!link || link.creator_id !== user.id) {
    return Response.json({ error: "Link não encontrado." }, { status: 404 });
  }

  try {
    const result = await storeProfileLinkPreview({
      creatorId: link.creator_id,
      linkId: link.id,
      url: link.url,
    });

    if (result.status === "no_source" || result.status === "fetch_failed") {
      await clearProfileLinkStoredImage(link.creator_id, link.id);
      return Response.json({ imagePath: null, imageMime: null });
    }

    if (result.status === "too_large") {
      return Response.json({ error: "Imagem muito grande." }, { status: 400 });
    }

    if (result.status === "storage_failed") {
      return Response.json(
        { error: result.message ?? "Falha ao salvar a imagem." },
        { status: 500 }
      );
    }

    const { error: updateError } = await server
      .from("profile_links")
      .update({
        image_path: result.imagePath,
        image_mime: result.imageMime,
      })
      .eq("id", linkId)
      .eq("creator_id", user.id);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    return Response.json({
      imagePath: result.imagePath,
      imageMime: result.imageMime,
    });
  } catch {
    return Response.json(
      { error: "Não foi possível salvar a imagem do perfil." },
      { status: 500 }
    );
  }
}
