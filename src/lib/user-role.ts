import type { User, UserRole } from "@/core/models/user";

export function resolveUserRole(role: UserRole | undefined): UserRole {
  return role === "consumer" ? "consumer" : "creator";
}

export function isCreator(user: Pick<User, "role"> | null | undefined): boolean {
  return resolveUserRole(user?.role) === "creator";
}

export function isConsumer(user: Pick<User, "role"> | null | undefined): boolean {
  return resolveUserRole(user?.role) === "consumer";
}
