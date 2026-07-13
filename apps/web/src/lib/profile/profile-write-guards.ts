import "server-only";

import type { UserRole } from "@vippin/core/models/user";
import type { ProfileWriteInput } from "@/lib/profile/profile-write-server";

const GLOBAL_FORBIDDEN: (keyof ProfileWriteInput)[] = [
  "role",
  "email",
  "displayName",
  "avatarFromGoogle",
];

const CONSUMER_ALLOWED: (keyof ProfileWriteInput)[] = [
  "consumerName",
  "avatarPath",
  "avatarMime",
  "avatarUrl",
  "onboardingCompleted",
];

const CREATOR_ALLOWED: (keyof ProfileWriteInput)[] = [
  "name",
  "creatorName",
  "slug",
  "birthDate",
  "pixKey",
  "pixKeyType",
  "socials",
  "avatarPath",
  "avatarMime",
  "avatarUrl",
  "onboardingCompleted",
  "askMeEnabled",
  "askMePriceCents",
  "bio",
  "profileDefaultTab",
];

function keysOf(input: ProfileWriteInput): (keyof ProfileWriteInput)[] {
  return Object.keys(input) as (keyof ProfileWriteInput)[];
}

function labelForField(field: keyof ProfileWriteInput): string {
  const labels: Partial<Record<keyof ProfileWriteInput, string>> = {
    consumerName: "nome de consumidor",
    creatorName: "nome de criador",
    slug: "link público",
    pixKey: "chave PIX",
    socials: "redes sociais",
    role: "tipo de conta",
    name: "nome legal",
    birthDate: "data de nascimento",
    askMeEnabled: "Me pergunte",
    askMePriceCents: "preço do Me pergunte",
    bio: "bio",
    profileDefaultTab: "aba inicial do perfil",
  };
  return labels[field] ?? field;
}

/**
 * Strips disallowed profile fields for the caller's role.
 * Throws when the client explicitly sends forbidden keys.
 */
export function sanitizeProfileWriteInput(
  role: UserRole,
  input: ProfileWriteInput
): ProfileWriteInput {
  const allowed = role === "consumer" ? CONSUMER_ALLOWED : CREATOR_ALLOWED;
  const allowedSet = new Set<keyof ProfileWriteInput>(allowed);

  for (const key of keysOf(input)) {
    if (GLOBAL_FORBIDDEN.includes(key) || !allowedSet.has(key)) {
      throw new Error(
        role === "consumer"
          ? `Consumidores não podem alterar ${labelForField(key)}.`
          : `Criadores não podem alterar ${labelForField(key)}.`
      );
    }
  }

  return Object.fromEntries(
    keysOf(input)
      .filter((key) => allowedSet.has(key))
      .map((key) => [key, input[key]])
  ) as ProfileWriteInput;
}
