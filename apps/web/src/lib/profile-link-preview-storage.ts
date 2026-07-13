import "server-only";

import { fetchPlatformProfileImage } from "@/lib/avatar-proxy";
import { resolveProfileLinkPreviewImage } from "@/lib/profile-link-preview";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { PROFILE_LINKS_BUCKET } from "@/lib/supabase/storage";

export const PROFILE_LINK_PREVIEW_MAX_SIZE = 5 * 1024 * 1024;

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

export function buildProfileLinkPreviewPath(
  creatorId: string,
  linkId: string,
  mime: string
): string {
  return `${creatorId}/${linkId}/preview.${extensionForMime(mime)}`;
}

export type StoreProfileLinkPreviewResult =
  | { status: "stored"; imagePath: string; imageMime: string }
  | { status: "no_source" }
  | { status: "fetch_failed" }
  | { status: "too_large" }
  | { status: "storage_failed"; message: string };

/**
 * Resolves a platform profile image, downloads it, and stores it in the private
 * `profile-links` bucket. Served later via `/api/profile/links/[id]/image`.
 */
export async function storeProfileLinkPreview(input: {
  creatorId: string;
  linkId: string;
  url: string;
}): Promise<StoreProfileLinkPreviewResult> {
  const externalUrl = await resolveProfileLinkPreviewImage(input.url);
  if (!externalUrl) {
    return { status: "no_source" };
  }

  const upstream = await fetchPlatformProfileImage(externalUrl, input.url);
  if (!upstream.ok) {
    return { status: "fetch_failed" };
  }

  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength > PROFILE_LINK_PREVIEW_MAX_SIZE) {
    return { status: "too_large" };
  }

  const imageMime =
    upstream.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const imagePath = buildProfileLinkPreviewPath(
    input.creatorId,
    input.linkId,
    imageMime
  );

  const admin = createSupabaseAdminClient();
  const { error: uploadError } = await admin.storage
    .from(PROFILE_LINKS_BUCKET)
    .upload(imagePath, bytes, {
      contentType: imageMime,
      upsert: true,
    });

  if (uploadError) {
    return { status: "storage_failed", message: uploadError.message };
  }

  return { status: "stored", imagePath, imageMime };
}

export async function clearProfileLinkStoredImage(
  creatorId: string,
  linkId: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("profile_links")
    .update({ image_path: null, image_mime: null })
    .eq("id", linkId)
    .eq("creator_id", creatorId);
}
