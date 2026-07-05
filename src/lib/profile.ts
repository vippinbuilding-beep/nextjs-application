import { formatFileSize } from "@/lib/products";

const MB = 1024 * 1024;

export const AVATAR_MAX_SIZE = 5 * MB;
export const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function extractGoogleAvatarUrl(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  const url = metadata?.avatar_url ?? metadata?.picture;
  return typeof url === "string" && url.startsWith("https://") ? url : null;
}

export function hasProfileAvatar(profile: {
  avatarPath?: string | null;
  avatarUrl?: string | null;
}): boolean {
  return Boolean(profile.avatarPath || profile.avatarUrl);
}

/** Returns an error message if the avatar image is invalid, else null. */
export function validateAvatarFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "A foto precisa ser uma imagem (PNG, JPG, WEBP ou GIF).";
  }
  if (file.size > AVATAR_MAX_SIZE) {
    return `A imagem é muito grande. Tamanho máximo: ${formatFileSize(
      AVATAR_MAX_SIZE
    )}.`;
  }
  return null;
}
