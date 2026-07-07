import "server-only";

import type { UserRole } from "@/core/models/user";
import { notifyProfileOnboardingComplete } from "@/lib/notifications/dispatch";
import type { ProfileWriteInput } from "@/lib/profile/profile-write-server";
import type { ServerProfileRow } from "@/lib/profile/server-profile";

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

  if (!completingOnboarding) return;

  await notifyProfileOnboardingComplete({
    userId,
    role,
    href: resolveOnboardingHref(role, existing, sanitized),
  });
}
