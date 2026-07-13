export type AuthRole = "creator" | "consumer";

export function buildLoginUrl(options?: {
  role?: AuthRole;
  next?: string | null;
}): string {
  const params = new URLSearchParams();
  if (options?.role) params.set("role", options.role);
  if (options?.next) params.set("next", options.next);
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}

export function isAuthRole(value: string | null): value is AuthRole {
  return value === "creator" || value === "consumer";
}
