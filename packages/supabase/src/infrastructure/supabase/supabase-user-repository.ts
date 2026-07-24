import { supabase } from "../../client/client";
import { AVATARS_BUCKET } from "../../constants/buckets";
import type { PixKeyType, User, UserRole, UserSocials } from "@vippin/core/models/user";
import { isCreatorProfileTab } from "@vippin/core/domain/creator-profile-tabs";
import type {
  AvatarMetadata,
  UserRepository,
} from "@vippin/core/repositories/user-repository";

const TABLE = "profiles";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  name: string | null;
  consumer_name: string | null;
  birth_date: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  creator_name: string | null;
  slug: string | null;
  socials: UserSocials | null;
  onboarding_completed: boolean | null;
  role: string | null;
  avatar_path: string | null;
  avatar_mime: string | null;
  avatar_url: string | null;
  avatar_from_google: boolean | null;
  ask_me_enabled: boolean | null;
  ask_me_price_cents: number | null;
  bio: string | null;
  profile_default_tab: string | null;
  created_at: string | null;
};

function mapStorageError(error: { message: string }): Error {
  const msg = error.message.toLowerCase();
  if (msg.includes("maximum allowed size") || msg.includes("entity too large")) {
    return new Error("A imagem passou do limite do Supabase Storage.");
  }
  return new Error(error.message);
}

async function uploadAvatarViaSignedUrl(userId: string, file: File): Promise<string> {
  const response = await fetch("/api/profile/avatar/upload-url", {
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
    .from(AVATARS_BUCKET)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type || undefined,
    });
  if (error) throw mapStorageError(error);

  return path;
}

/**
 * Supabase (Postgres) implementation of {@link UserRepository}.
 * Each document lives in the `profiles` table, keyed by the Supabase Auth UID.
 */
export class SupabaseUserRepository implements UserRepository {
  async getById(id: string): Promise<User | null> {
    const response = await fetch("/api/profile/me");
    if (response.status === 401) return null;
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(body?.error ?? "Falha ao carregar perfil.");
    }
    const data = (await response.json()) as ProfileRow;
    if (data.id !== id) return null;
    return toUser(data);
  }

  async list(): Promise<User[]> {
    const { data, error } = await supabase.from(TABLE).select("*");
    if (error) throw new Error(error.message);
    return (data as ProfileRow[]).map(toUser);
  }

  async upsert(id: string, data: Partial<Omit<User, "id">>): Promise<void> {
    const response = await fetch("/api/profile/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(body?.error ?? "Falha ao salvar perfil.");
    }
  }

  async update(
    id: string,
    data: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<void> {
    const response = await fetch("/api/profile/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(body?.error ?? "Falha ao salvar perfil.");
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async generateUniqueSlug(base: string): Promise<string> {
    const response = await fetch("/api/profile/claim-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ desired: base }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(body?.error ?? "Falha ao gerar slug.");
    }
    const { slug } = (await response.json()) as { slug: string };
    return slug;
  }

  async uploadAvatar(userId: string, file: File): Promise<AvatarMetadata> {
    const uploadedPath = await uploadAvatarViaSignedUrl(userId, file);
    const { path, mime } = await transcodeAvatarToWebp(uploadedPath);
    return {
      avatarPath: path,
      avatarMime: mime || file.type || "application/octet-stream",
    };
  }
}

/**
 * Asks the server to convert the just-uploaded avatar to WebP in place. On any
 * failure it falls back to the original path/mime, so the upload still succeeds.
 */
async function transcodeAvatarToWebp(
  path: string
): Promise<{ path: string; mime: string | null }> {
  try {
    const response = await fetch("/api/profile/avatar/transcode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!response.ok) return { path, mime: null };
    return (await response.json()) as { path: string; mime: string | null };
  } catch {
    return { path, mime: null };
  }
}

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email ?? "",
    displayName: row.display_name ?? null,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    name: row.name ?? undefined,
    consumerName: row.consumer_name ?? undefined,
    birthDate: row.birth_date ?? undefined,
    pixKey: row.pix_key ?? undefined,
    pixKeyType: row.pix_key_type
      ? (row.pix_key_type.toUpperCase() as PixKeyType)
      : undefined,
    creatorName: row.creator_name ?? undefined,
    slug: row.slug ?? undefined,
    socials: row.socials ?? undefined,
    onboardingCompleted: row.onboarding_completed ?? false,
    role: (row.role === "consumer" ? "consumer" : "creator") as UserRole,
    avatarPath: row.avatar_path ?? undefined,
    avatarMime: row.avatar_mime ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    avatarFromGoogle: row.avatar_from_google ?? false,
    askMeEnabled: row.ask_me_enabled ?? false,
    askMePriceCents: row.ask_me_price_cents ?? undefined,
    bio: row.bio ?? undefined,
    profileDefaultTab:
      row.profile_default_tab && isCreatorProfileTab(row.profile_default_tab)
        ? row.profile_default_tab
        : undefined,
  };
}
