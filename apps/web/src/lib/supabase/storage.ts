/**
 * Storage helpers shared by client and server code.
 *
 * The `products` bucket is PRIVATE. Files are never exposed via a public URL;
 * instead the browser only ever talks to our gated Route Handlers under
 * `/api/products/[id]/*`, which stream the bytes (or redirect to a short-lived
 * signed URL) after validating access. The builders below just assemble those
 * route paths (no network call), so they work in Server Components too.
 */
export {
  PRODUCTS_BUCKET,
  AVATARS_BUCKET,
  PROFILE_LINKS_BUCKET,
  ASK_ME_ANSWERS_BUCKET,
} from "@vippin/supabase/constants/buckets";

/** URL of the gated video stream route. Requires a media token minted server-side. */
export function getProductMediaUrl(productId: string, token: string): string {
  return `/api/products/${productId}/media?token=${encodeURIComponent(token)}`;
}

/** URL of the gated document download route. Requires a media token minted server-side. */
export function getProductDownloadUrl(productId: string, token: string): string {
  return `/api/products/${productId}/download?token=${encodeURIComponent(token)}`;
}

/**
 * URL of the thumbnail route (redirects to a short-lived signed URL). Thumbnails
 * are not sensitive, so this route is public and cacheable — pass the current
 * `thumbnailPath` as `cacheKey` so a new upload (new storage path) busts the
 * browser/CDN cache instead of serving the old image for up to 5 minutes.
 */
export function getProductThumbnailUrl(
  productId: string,
  cacheKey?: string | null
): string {
  const base = `/api/products/${productId}/thumbnail`;
  if (!cacheKey) return base;
  return `${base}?v=${encodeURIComponent(cacheKey)}`;
}

/** Public avatar route (streams uploaded bytes or proxies an external URL). */
export function getProfileAvatarUrl(userId: string, cacheKey?: string | null): string {
  const base = `/api/profiles/${userId}/avatar`;
  if (!cacheKey) return base;
  return `${base}?v=${encodeURIComponent(cacheKey)}`;
}

/** Proxied Google OAuth photo for the signed-in user (onboarding preview). */
export function getProfileAvatarPreviewUrl(): string {
  return "/api/profile/avatar/preview";
}

/**
 * Public route for a stored profile link preview image. Pass the current
 * `imagePath` as `cacheKey` so a new upload (new storage path) busts the
 * long-lived browser cache instead of serving the old image.
 */
export function getProfileLinkImageUrl(
  linkId: string,
  cacheKey?: string | null
): string {
  const base = `/api/profile/links/${linkId}/image`;
  if (!cacheKey) return base;
  return `${base}?v=${encodeURIComponent(cacheKey)}`;
}

/** Gated route for an ask-me answer video. */
export function getAskMeAnswerVideoUrl(questionId: string): string {
  return `/api/ask-me/questions/${questionId}/video`;
}

/**
 * Sanitizes an uploaded file name so it is safe to use in a storage path while
 * keeping its extension. Non-alphanumeric runs become a single hyphen.
 */
export function sanitizeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeBase = base || "arquivo";
  return ext ? `${safeBase}.${ext}` : safeBase;
}
