import { supabase } from "@/lib/supabase/client";
import type { PixKeyType, User, UserSocials } from "@/core/models/user";
import type { UserRepository } from "@/core/repositories/user-repository";

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
  };
}
