import "server-only";

import type { User, UserRole, UserSocials } from "@vippin/core/models/user";
import { isCreatorProfileTab } from "@/lib/creator-profile-tabs";
import { validateAskMePriceInput } from "@vippin/core/domain/ask-me";
import { validateBirthDateAge } from "@/lib/profile/birth-date";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";

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
};

export type ProfileWriteInput = Partial<Omit<User, "id" | "createdAt">>;

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

function toProfileRow(
  userId: string,
  data: ProfileWriteInput
): Partial<ProfileRow> & { id: string } {
  const row: Partial<ProfileRow> & { id: string } = { id: userId };

  if (data.email !== undefined) row.email = data.email;
  if (data.displayName !== undefined) row.display_name = data.displayName;
  if (data.name !== undefined) row.name = data.name;
  if (data.consumerName !== undefined) row.consumer_name = data.consumerName;
  if (data.birthDate !== undefined) {
    const birthError = validateBirthDateAge(data.birthDate);
    if (birthError) throw new Error(birthError);
    row.birth_date = data.birthDate;
  }
  if (data.pixKey !== undefined) row.pix_key = data.pixKey;
  if (data.pixKeyType !== undefined) {
    row.pix_key_type = data.pixKeyType ? data.pixKeyType.toLowerCase() : null;
  }
  if (data.creatorName !== undefined) row.creator_name = data.creatorName;
  if (data.slug !== undefined) row.slug = data.slug;
  if (data.socials !== undefined) row.socials = data.socials;
  if (data.onboardingCompleted !== undefined) {
    row.onboarding_completed = data.onboardingCompleted;
  }
  if (data.role !== undefined) row.role = data.role;
  if (data.avatarPath !== undefined) {
    row.avatar_path = data.avatarPath;
    row.avatar_url = null;
    if (data.avatarFromGoogle === undefined) {
      row.avatar_from_google = false;
    }
  }
  if (data.avatarMime !== undefined) row.avatar_mime = data.avatarMime;
  if (data.avatarUrl !== undefined) row.avatar_url = data.avatarUrl;
  if (data.avatarFromGoogle !== undefined) {
    row.avatar_from_google = data.avatarFromGoogle;
  }
  if (data.askMeEnabled !== undefined) row.ask_me_enabled = data.askMeEnabled;
  if (data.askMePriceCents !== undefined) {
    if (data.askMePriceCents != null) {
      const priceError = validateAskMePriceInput(data.askMePriceCents);
      if (priceError) throw new Error(priceError);
    }
    row.ask_me_price_cents = data.askMePriceCents;
  }
  if (data.bio !== undefined) {
    const trimmed = data.bio?.trim() ?? "";
    if (trimmed.length > 120) {
      throw new Error("A bio pode ter no máximo 120 caracteres.");
    }
    row.bio = trimmed || null;
  }
  if (data.profileDefaultTab !== undefined) {
    if (data.profileDefaultTab !== null && !isCreatorProfileTab(data.profileDefaultTab)) {
      throw new Error("Aba inicial do perfil inválida.");
    }
    row.profile_default_tab = data.profileDefaultTab;
  }

  return row;
}

/** Upserts the authenticated user's profile (service role, server-only). */
export async function upsertProfileForUser(
  userId: string,
  data: ProfileWriteInput
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const row = toProfileRow(userId, data);

  const { error } = await admin.from("profiles").upsert(row, {
    onConflict: "id",
  });
  if (error) throw mapWriteError(error);
}

/** Updates the authenticated user's profile (service role, server-only). */
export async function updateProfileForUser(
  userId: string,
  data: ProfileWriteInput
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const row = toProfileRow(userId, data);
  delete (row as { id?: string }).id;

  const { error } = await admin.from("profiles").update(row).eq("id", userId);
  if (error) throw mapWriteError(error);
}

export interface EnsureAuthProfileInput {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  role: UserRole;
}

/** Creates the OAuth profile row on first sign-in if it does not exist yet. */
export async function ensureProfileForAuthUser(
  input: EnsureAuthProfileInput
): Promise<{ onboardingCompleted: boolean }> {
  const admin = createSupabaseAdminClient();

  const { data: existing, error: readError } = await admin
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", input.userId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (existing) {
    return { onboardingCompleted: existing.onboarding_completed ?? false };
  }

  const { data: created, error: insertError } = await admin
    .from("profiles")
    .insert({
      id: input.userId,
      email: input.email ?? null,
      display_name: input.displayName ?? null,
      role: input.role,
      onboarding_completed: false,
    })
    .select("onboarding_completed")
    .single();

  if (insertError) throw new Error(insertError.message);

  return { onboardingCompleted: created.onboarding_completed ?? false };
}

export function resolveProfileRole(role: string | null | undefined): UserRole {
  return role === "consumer" ? "consumer" : "creator";
}
