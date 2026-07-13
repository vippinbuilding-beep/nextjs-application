/** In-app return path after login (must be a same-origin relative path). */

const BLOCKED_PREFIXES = ["/login", "/auth/callback", "/onboarding"];

export function safeReturnPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return null;
  }
  if (BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}/`))) {
    return null;
  }
  return path;
}

/** Builds a return path from pathname + optional query (with or without leading `?`). */
export function buildReturnPath(pathname: string, search?: string): string {
  const normalizedSearch =
    search && search.length > 0
      ? search.startsWith("?")
        ? search
        : `?${search}`
      : "";
  return safeReturnPath(`${pathname}${normalizedSearch}`) ?? "/";
}

const STORAGE_KEY = "vippin:login:next";

export function persistLoginReturnPath(path: string | null | undefined): void {
  if (typeof sessionStorage === "undefined") return;
  const safe = safeReturnPath(path);
  if (safe) sessionStorage.setItem(STORAGE_KEY, safe);
}

export function readStoredLoginReturnPath(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return safeReturnPath(sessionStorage.getItem(STORAGE_KEY));
}

export function clearStoredLoginReturnPath(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Same-origin referrer path when the user opened login from another in-app page. */
export function readReferrerReturnPath(): string | null {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    const ref = new URL(document.referrer);
    if (ref.origin !== window.location.origin) return null;
    return safeReturnPath(`${ref.pathname}${ref.search}`);
  } catch {
    return null;
  }
}

/** Resolves where to send the user after auth (explicit `next` wins). */
export function resolveLoginReturnPath(
  explicitNext: string | null | undefined,
  fallback = "/"
): string {
  return (
    safeReturnPath(explicitNext) ??
    readStoredLoginReturnPath() ??
    readReferrerReturnPath() ??
    fallback
  );
}

export function buildOnboardingUrl(next: string | null | undefined): string {
  const safe = safeReturnPath(next);
  if (!safe) return "/onboarding";
  return `/onboarding?next=${encodeURIComponent(safe)}`;
}
