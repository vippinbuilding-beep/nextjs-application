import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

/**
 * Above this size we skip transcoding to avoid blowing the serverless memory /
 * time budget. Avatars (max 5 MB) always transcode; only pathologically large
 * thumbnails are left as-is.
 */
const MAX_TRANSCODE_BYTES = 20 * 1024 * 1024;

const WEBP_QUALITY = 82;

export interface TranscodeResult {
  /** Final storage path: the new `.webp` path on success, or the original. */
  path: string;
  /** `"image/webp"` on success; `null` when the original was kept. */
  mime: string | null;
}

/** Swaps the file extension for `.webp` (only a dot in the last segment counts). */
function toWebpPath(path: string): string {
  const slash = path.lastIndexOf("/");
  const dot = path.lastIndexOf(".");
  if (dot > slash) return `${path.slice(0, dot)}.webp`;
  return `${path}.webp`;
}

/**
 * Converts an already-uploaded raster image in Storage to WebP (animation
 * preserved) and swaps it in place, returning the new path. Best-effort: on any
 * problem it leaves the original untouched and returns it, so a failed
 * conversion never breaks the upload the user just made.
 */
export async function transcodeStoredImageToWebp(
  admin: SupabaseClient,
  bucket: string,
  originalPath: string
): Promise<TranscodeResult> {
  // Already WebP (e.g. the user uploaded one): nothing to gain from re-encoding.
  if (originalPath.toLowerCase().endsWith(".webp")) {
    return { path: originalPath, mime: "image/webp" };
  }

  const webpPath = toWebpPath(originalPath);
  if (webpPath === originalPath) {
    return { path: originalPath, mime: null };
  }

  try {
    const { data: blob, error } = await admin.storage
      .from(bucket)
      .download(originalPath);
    if (error || !blob || blob.size > MAX_TRANSCODE_BYTES) {
      return { path: originalPath, mime: null };
    }

    const input = Buffer.from(await blob.arrayBuffer());
    const webp = await sharp(input, { animated: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(webpPath, webp, { contentType: "image/webp", upsert: true });
    if (uploadError) return { path: originalPath, mime: null };

    // Source is now redundant. A failed cleanup only leaves an orphan; the WebP
    // is already the source of truth, so don't let it revert the result.
    try {
      await admin.storage.from(bucket).remove([originalPath]);
    } catch {
      // ignore
    }

    return { path: webpPath, mime: "image/webp" };
  } catch {
    return { path: originalPath, mime: null };
  }
}
