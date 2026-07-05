import { supabase } from "@/lib/supabase/client";
import {
  PROFILE_LINKS_BUCKET,
  sanitizeFileName,
} from "@/lib/supabase/storage";
import type { ProfileLink } from "@/core/models/profile-link";
import type {
  ProfileLinkImageMetadata,
  ProfileLinkInput,
  ProfileLinkRepository,
} from "@/core/repositories/profile-link-repository";
import { PROFILE_LINK_LIMITS } from "@/lib/profile-links";

const TABLE = "profile_links";

type ProfileLinkRow = {
  id: string;
  creator_id: string;
  title: string;
  url: string;
  image_path: string | null;
  image_mime: string | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

function mapWriteError(error: { code?: string; message: string }): Error {
  if (error.code === "23514" && error.message.includes("profile_links_url")) {
    return new Error("O link precisa começar com https://");
  }
  if (error.code === "23514" && error.message.includes("profile_links_title")) {
    return new Error("Título do link inválido.");
  }
  return new Error(error.message);
}

function mapStorageError(error: { message: string }): Error {
  const msg = error.message.toLowerCase();
  if (msg.includes("maximum allowed size") || msg.includes("entity too large")) {
    return new Error("A imagem passou do limite do Supabase Storage.");
  }
  return new Error(error.message);
}

async function uploadImageViaSignedUrl(
  linkId: string,
  file: File
): Promise<ProfileLinkImageMetadata> {
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
    throw mapStorageError({
      message: body?.error ?? "Falha ao preparar o upload.",
    });
  }

  const { path, token } = (await response.json()) as {
    path: string;
    token: string;
  };

  const { error } = await supabase.storage
    .from(PROFILE_LINKS_BUCKET)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type || undefined,
    });
  if (error) throw mapStorageError(error);

  return {
    imagePath: path,
    imageMime: file.type || "application/octet-stream",
  };
}

export class SupabaseProfileLinkRepository implements ProfileLinkRepository {
  async listByCreator(creatorId: string): Promise<ProfileLink[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("creator_id", creatorId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as ProfileLinkRow[]).map(toProfileLink);
  }

  async create(creatorId: string, data: ProfileLinkInput): Promise<ProfileLink> {
    const existing = await this.listByCreator(creatorId);
    if (existing.length >= PROFILE_LINK_LIMITS.maxLinks) {
      throw new Error(
        `Você pode ter no máximo ${PROFILE_LINK_LIMITS.maxLinks} links.`
      );
    }

    const sortOrder =
      data.sortOrder ??
      (existing.length > 0
        ? Math.max(...existing.map((link) => link.sortOrder)) + 1
        : 0);

    const { data: row, error } = await supabase
      .from(TABLE)
      .insert({
        creator_id: creatorId,
        title: data.title.trim(),
        url: data.url,
        sort_order: sortOrder,
      })
      .select("*")
      .single();
    if (error) throw mapWriteError(error);
    return toProfileLink(row as ProfileLinkRow);
  }

  async update(
    id: string,
    data: Partial<ProfileLinkInput & ProfileLinkImageMetadata>
  ): Promise<void> {
    const row: Partial<ProfileLinkRow> = {};
    if (data.title !== undefined) row.title = data.title.trim();
    if (data.url !== undefined) row.url = data.url;
    if (data.sortOrder !== undefined) row.sort_order = data.sortOrder;
    if (data.imagePath !== undefined) row.image_path = data.imagePath;
    if (data.imageMime !== undefined) row.image_mime = data.imageMime;

    const { error } = await supabase.from(TABLE).update(row).eq("id", id);
    if (error) throw mapWriteError(error);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async reorder(creatorId: string, orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) =>
      supabase
        .from(TABLE)
        .update({ sort_order: index })
        .eq("id", id)
        .eq("creator_id", creatorId)
    );
    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new Error(failed.error.message);
  }

  async uploadImage(linkId: string, file: File): Promise<ProfileLinkImageMetadata> {
    const metadata = await uploadImageViaSignedUrl(linkId, file);
    await this.update(linkId, metadata);
    return metadata;
  }
}

function toProfileLink(row: ProfileLinkRow): ProfileLink {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    url: row.url,
    imagePath: row.image_path ?? undefined,
    imageMime: row.image_mime ?? undefined,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

// Reserved for future server-side path building if needed.
export function buildProfileLinkImagePath(
  creatorId: string,
  linkId: string,
  fileName: string
): string {
  return `${creatorId}/${linkId}/${sanitizeFileName(fileName)}`;
}
