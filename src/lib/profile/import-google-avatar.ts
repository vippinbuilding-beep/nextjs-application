import "server-only";

import { AVATAR_MAX_SIZE, extractGoogleAvatarUrl } from "@/lib/profile";
import { fetchExternalAvatar } from "@/lib/avatar-proxy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AVATARS_BUCKET } from "@/lib/supabase/storage";

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

export type ImportGoogleAvatarResult =
  | { status: "imported"; path: string; mime: string }
  | { status: "already_stored"; path: string }
  | { status: "no_source" }
  | { status: "fetch_failed"; httpStatus: number }
  | { status: "too_large" }
  | { status: "storage_failed"; message: string }
  | { status: "profile_failed"; message: string };

/**
 * Downloads a Google (or legacy external) avatar into the private avatars
 * bucket and updates the profile to use avatar_path only.
 */
export async function importGoogleAvatarForUser(input: {
  userId: string;
  metadata?: Record<string, unknown> | null;
  legacyAvatarUrl?: string | null;
  force?: boolean;
}): Promise<ImportGoogleAvatarResult> {
  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_path, avatar_from_google")
    .eq("id", input.userId)
    .maybeSingle();

  if (profile?.avatar_path && !input.force) {
    return { status: "already_stored", path: profile.avatar_path };
  }

  const googleUrl =
    extractGoogleAvatarUrl(input.metadata ?? null) ??
    (typeof input.legacyAvatarUrl === "string" &&
    input.legacyAvatarUrl.startsWith("https://")
      ? input.legacyAvatarUrl
      : null);

  if (!googleUrl) {
    return { status: "no_source" };
  }

  const upstream = await fetchExternalAvatar(googleUrl);
  if (!upstream.ok) {
    return { status: "fetch_failed", httpStatus: upstream.status };
  }

  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength > AVATAR_MAX_SIZE) {
    return { status: "too_large" };
  }

  const contentType =
    upstream.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const path = `${input.userId}/avatar-google.${extensionForMime(contentType)}`;

  const { error: uploadError } = await admin.storage
    .from(AVATARS_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    return { status: "storage_failed", message: uploadError.message };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      avatar_path: path,
      avatar_mime: contentType,
      avatar_url: null,
      avatar_from_google: true,
    })
    .eq("id", input.userId);

  if (updateError) {
    return { status: "profile_failed", message: updateError.message };
  }

  return { status: "imported", path, mime: contentType };
}

/** Migrates profiles that still store a Google URL in avatar_url. */
export async function migrateLegacyGoogleAvatar(input: {
  userId: string;
  metadata?: Record<string, unknown> | null;
  avatarPath?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  if (input.avatarPath) return;
  if (!input.avatarUrl && !extractGoogleAvatarUrl(input.metadata ?? null)) return;

  await importGoogleAvatarForUser({
    userId: input.userId,
    metadata: input.metadata,
    legacyAvatarUrl: input.avatarUrl,
    force: true,
  });
}
