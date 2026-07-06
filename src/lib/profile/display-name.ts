import type { User } from "@/core/models/user";

/** How a consumer appears in the app UI. */
export function resolveConsumerDisplayName(
  user: Pick<User, "consumerName" | "displayName" | "email">
): string {
  if (user.consumerName?.trim()) return user.consumerName.trim();
  if (user.displayName?.trim()) return user.displayName.trim();
  const emailPrefix = user.email.split("@")[0]?.trim();
  return emailPrefix || "Usuário";
}
