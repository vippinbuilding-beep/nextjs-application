import { supabase } from "@/lib/supabase/client";
import { AVATARS_BUCKET } from "@/lib/supabase/storage";
import type { PixKeyType, User, UserRole, UserSocials } from "@/core/models/user";
import type {
  AvatarMetadata,
  UserRepository,
} from "@/core/repositories/user-repository";

const TABLE = "profiles";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  name: string | null;
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
  ask_me_enabled: boolean | null;
  ask_me_price_cents: number | null;
  created_at: string | null;
};

/**
 * Maps a Postgres unique-violation (code 23505) to a friendly, domain-level
 * message so the onboarding UI can tell the user exactly what to fix.
 */
function mapWriteError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    if (error.message.includes("creator_name")) {
      return new Error("Esse nome de criador já está em uso. Escolha outro.");
    }
    if (error.message.includes("slug")) {
      return new Error("Não foi possível gerar um link único. Tente novamente.");
    }
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
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toUser(data as ProfileRow);
  }

  async list(): Promise<User[]> {
    const { data, error } = await supabase.from(TABLE).select("*");
    if (error) throw new Error(error.message);
    return (data as ProfileRow[]).map(toUser);
  }

  async upsert(id: string, data: Partial<Omit<User, "id">>): Promise<void> {
    const row: Partial<ProfileRow> & { id: string } = { id };
    if (data.email !== undefined) row.email = data.email;
    if (data.displayName !== undefined) row.display_name = data.displayName;
    if (data.name !== undefined) row.name = data.name;
    if (data.birthDate !== undefined) row.birth_date = data.birthDate;
    if (data.pixKey !== undefined) row.pix_key = data.pixKey;
    if (data.pixKeyType !== undefined)
      row.pix_key_type = data.pixKeyType ? data.pixKeyType.toLowerCase() : null;
    if (data.creatorName !== undefined) row.creator_name = data.creatorName;
    if (data.slug !== undefined) row.slug = data.slug;
    if (data.socials !== undefined) row.socials = data.socials;
    if (data.onboardingCompleted !== undefined)
      row.onboarding_completed = data.onboardingCompleted;
    if (data.role !== undefined) row.role = data.role;
    if (data.avatarPath !== undefined) row.avatar_path = data.avatarPath;
    if (data.avatarMime !== undefined) row.avatar_mime = data.avatarMime;
    if (data.avatarUrl !== undefined) row.avatar_url = data.avatarUrl;
    if (data.askMeEnabled !== undefined) row.ask_me_enabled = data.askMeEnabled;
    if (data.askMePriceCents !== undefined)
      row.ask_me_price_cents = data.askMePriceCents;

    const { error } = await supabase.from(TABLE).upsert(row, {
      onConflict: "id",
    });
    if (error) throw mapWriteError(error);
  }

  async update(
    id: string,
    data: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<void> {
    const row: Partial<ProfileRow> = {};
    if (data.email !== undefined) row.email = data.email;
    if (data.displayName !== undefined) row.display_name = data.displayName;
    if (data.name !== undefined) row.name = data.name;
    if (data.birthDate !== undefined) row.birth_date = data.birthDate;
    if (data.pixKey !== undefined) row.pix_key = data.pixKey;
    if (data.pixKeyType !== undefined)
      row.pix_key_type = data.pixKeyType ? data.pixKeyType.toLowerCase() : null;
    if (data.creatorName !== undefined) row.creator_name = data.creatorName;
    if (data.slug !== undefined) row.slug = data.slug;
    if (data.socials !== undefined) row.socials = data.socials;
    if (data.onboardingCompleted !== undefined)
      row.onboarding_completed = data.onboardingCompleted;
    if (data.role !== undefined) row.role = data.role;
    if (data.avatarPath !== undefined) row.avatar_path = data.avatarPath;
    if (data.avatarMime !== undefined) row.avatar_mime = data.avatarMime;
    if (data.avatarUrl !== undefined) row.avatar_url = data.avatarUrl;
    if (data.askMeEnabled !== undefined) row.ask_me_enabled = data.askMeEnabled;
    if (data.askMePriceCents !== undefined)
      row.ask_me_price_cents = data.askMePriceCents;

    const { error } = await supabase.from(TABLE).update(row).eq("id", id);
    if (error) throw mapWriteError(error);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async generateUniqueSlug(base: string): Promise<string> {
    const { data, error } = await supabase.rpc("claim_profile_slug", {
      desired: base,
    });
    if (error) throw new Error(error.message);
    return data as string;
  }

  async uploadAvatar(userId: string, file: File): Promise<AvatarMetadata> {
    const avatarPath = await uploadAvatarViaSignedUrl(userId, file);
    return {
      avatarPath,
      avatarMime: file.type || "application/octet-stream",
    };
  }
}

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email ?? "",
    displayName: row.display_name ?? null,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    name: row.name ?? undefined,
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
    askMeEnabled: row.ask_me_enabled ?? false,
    askMePriceCents: row.ask_me_price_cents ?? undefined,
  };
}
