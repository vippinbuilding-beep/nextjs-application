import { formatFileSize } from "@/lib/products";
import { supabase } from "@/lib/supabase/client";
import { PROFILE_LINKS_BUCKET } from "@/lib/supabase/storage";

export const PROFILE_LINK_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

export const PROFILE_LINK_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif";

/** Returns an error message if the image is invalid, else null. */
export function validateProfileLinkImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "A imagem precisa ser PNG, JPG, WEBP ou GIF.";
  }
  if (file.size > PROFILE_LINK_IMAGE_MAX_SIZE) {
    return `A imagem é muito grande. Tamanho máximo: ${formatFileSize(
      PROFILE_LINK_IMAGE_MAX_SIZE
    )}.`;
  }
  return null;
}

export async function uploadProfileLinkImage(
  linkId: string,
  file: File
): Promise<{ path: string; mime: string }> {
  const validationError = validateProfileLinkImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const response = await fetch(`/api/profile/links/${linkId}/upload-url`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || undefined,
      size: file.size,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "Falha ao preparar o upload da imagem.");
  }

  const { path, token } = (await response.json()) as {
    path: string;
    token: string;
  };

  const mime = file.type || "image/jpeg";
  const { error } = await supabase.storage
    .from(PROFILE_LINKS_BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: mime });

  if (error) {
    throw new Error(error.message);
  }

  return { path, mime };
}
