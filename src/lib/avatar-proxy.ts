/** How long browsers may cache proxied avatar bytes. */
export const AVATAR_BROWSER_CACHE_SECONDS = 60 * 60;

/** How long the server reuses a fetched external avatar (e.g. Google). */
export const AVATAR_UPSTREAM_REVALIDATE_SECONDS = 60 * 60 * 24;

export async function fetchExternalAvatar(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: "image/*",
      "User-Agent": "Mozilla/5.0 (compatible; Vippin/1.0; +https://vippin.app)",
    },
    next: { revalidate: AVATAR_UPSTREAM_REVALIDATE_SECONDS },
  });
}

export function avatarResponseHeaders(
  contentType: string,
  contentLength?: string | null
): Headers {
  const headers = new Headers();
  headers.set("content-type", contentType);
  if (contentLength) headers.set("content-length", contentLength);
  headers.set(
    "cache-control",
    `public, max-age=${AVATAR_BROWSER_CACHE_SECONDS}, stale-while-revalidate=86400`
  );
  return headers;
}
