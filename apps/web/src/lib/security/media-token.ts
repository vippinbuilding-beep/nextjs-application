import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived, signed tokens that gate access to the media Route Handlers.
 *
 * A token is minted server-side (in a Server Component) when a product page is
 * rendered, and verified by the `/api/products/[id]/media` and `/download`
 * routes. Because the token is bound to a specific product + kind and expires
 * quickly, it prevents naive hotlinking or sharing of the API URL: a copied
 * link stops working within minutes and cannot be repurposed for another
 * product.
 *
 * This is a deterrent, not DRM. It runs only on the server (see `server-only`),
 * signed with `MEDIA_TOKEN_SECRET`.
 */
export type MediaKind = "media" | "download";

/** Default token lifetime. Short enough to limit sharing, long enough to start playback. */
const DEFAULT_TTL_SECONDS = 60 * 5;

interface TokenPayload {
  /** Product id the token grants access to. */
  p: string;
  /** Kind of access (video stream vs document download). */
  k: MediaKind;
  /** Expiry, unix seconds. */
  e: number;
}

function getSecret(): string {
  const secret = process.env.MEDIA_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      "Missing MEDIA_TOKEN_SECRET environment variable. Set it in your server " +
        "environment to sign media access tokens."
    );
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(data: string): string {
  return base64url(createHmac("sha256", getSecret()).update(data).digest());
}

/** Mints a signed token granting access to `productId` for `kind`. */
export function signMediaToken(
  productId: string,
  kind: MediaKind,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  const payload: TokenPayload = {
    p: productId,
    k: kind,
    e: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

/**
 * Verifies a token matches `productId` + `kind`, has a valid signature and is
 * not expired. Returns true only when every check passes.
 */
export function verifyMediaToken(
  token: string | null | undefined,
  productId: string,
  kind: MediaKind
): boolean {
  if (!token) return false;

  const dot = token.indexOf(".");
  if (dot <= 0) return false;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(encoded);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()
    );
  } catch {
    return false;
  }

  if (payload.p !== productId || payload.k !== kind) return false;
  if (typeof payload.e !== "number" || payload.e < Math.floor(Date.now() / 1000)) {
    return false;
  }

  return true;
}
