import "server-only";

import type { UserRole } from "@/core/models/user";
import {
  notifyProfileOnboardingComplete,
  notifyProfileUpdated,
} from "@/lib/notifications/dispatch";
import type { ProfileWriteInput } from "@/lib/profile/profile-write-server";
import type { ServerProfileRow } from "@/lib/profile/server-profile";

const CONSUMER_PROFILE_FIELDS: (keyof ProfileWriteInput)[] = [
  "consumerName",
  "avatarPath",
  "avatarMime",
  "avatarUrl",
];

const CREATOR_PROFILE_FIELDS: (keyof ProfileWriteInput)[] = [
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
  "askMeEnabled",
  "askMePriceCents",
  "bio",
];

function hasFieldChange(
  sanitized: ProfileWriteInput,
  fields: (keyof ProfileWriteInput)[]
): boolean {
  return fields.some((field) => sanitized[field] !== undefined);
}

function resolveOnboardingHref(
  role: UserRole,
  existing: ServerProfileRow | null,
  sanitized: ProfileWriteInput
): string {
  if (role === "consumer") return "/explore";

  const slug = sanitized.slug ?? existing?.slug;
  return slug ? `/@${slug}` : "/";
}

/** Dispatches profile-related notifications after a successful profile write. */
export async function dispatchProfileWriteNotifications(
  userId: string,
  existing: ServerProfileRow | null,
  sanitized: ProfileWriteInput,
  role: UserRole
): Promise<void> {
  const wasOnboarded = existing?.onboarding_completed ?? false;
  const completingOnboarding =
    sanitized.onboardingCompleted === true && !wasOnboarded;

  if (completingOnboarding) {
    await notifyProfileOnboardingComplete({
      userId,
      role,
      href: resolveOnboardingHref(role, existing, sanitized),
    });
    return;
  }

  if (!wasOnboarded) return;

  const fields =
    role === "consumer" ? CONSUMER_PROFILE_FIELDS : CREATOR_PROFILE_FIELDS;

  if (hasFieldChange(sanitized, fields)) {
    await notifyProfileUpdated({ userId });
  }
}
