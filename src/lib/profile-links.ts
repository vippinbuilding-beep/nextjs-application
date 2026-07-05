export const PROFILE_LINK_LIMITS = {
  maxLinks: 20,
  title: { min: 2, max: 60 },
  imageMaxSize: 5 * 1024 * 1024,
} as const;

export const PROFILE_LINK_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif";

/** Normalizes user input to a https URL or returns null when invalid. */
export function normalizeProfileLinkUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "https:") return null;
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function validateProfileLinkTitle(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length < PROFILE_LINK_LIMITS.title.min) {
    return `O título precisa ter pelo menos ${PROFILE_LINK_LIMITS.title.min} caracteres`;
  }
  if (trimmed.length > PROFILE_LINK_LIMITS.title.max) {
    return `O título pode ter no máximo ${PROFILE_LINK_LIMITS.title.max} caracteres`;
  }
  return null;
}

export function validateProfileLinkUrl(url: string): string | null {
  if (!normalizeProfileLinkUrl(url)) {
    return "Informe um link válido começando com https://";
  }
  return null;
}

export function validateProfileLinkImage(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "A imagem precisa ser PNG, JPG, WEBP ou GIF.";
  }
  if (file.size > PROFILE_LINK_LIMITS.imageMaxSize) {
    return "A imagem é muito grande. Máximo: 5 MB.";
  }
  return null;
}
