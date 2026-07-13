import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { canNavigateBack } from "@/lib/navigation/in-app-navigation";

const AUTH_ENTRY_PATH_PREFIXES = ["/login", "/auth/callback"];

const EXTERNAL_OAUTH_HOST_SUFFIXES = ["accounts.google.com", "google.com"];

function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function hasExternalOAuthReferrer(): boolean {
  if (typeof document === "undefined" || document.referrer === "") {
    return false;
  }

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) {
      return false;
    }

    const host = referrer.hostname;
    return EXTERNAL_OAUTH_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

export function hasAuthEntryReferrer(): boolean {
  if (typeof document === "undefined" || document.referrer === "") {
    return false;
  }

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin !== window.location.origin) {
      return false;
    }

    return isAuthEntryPath(referrer.pathname);
  } catch {
    return false;
  }
}

/** Same-origin referrer excluding login/OAuth callback and external OAuth providers. */
export function hasSameOriginReferrer(): boolean {
  if (
    typeof document === "undefined" ||
    document.referrer === "" ||
    hasExternalOAuthReferrer() ||
    hasAuthEntryReferrer()
  ) {
    return false;
  }

  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Uses browser history when the user arrived from another in-app page; otherwise goes to fallback. */
export function navigateBack(router: AppRouterInstance, fallback: string): void {
  if (canNavigateBack(hasSameOriginReferrer())) {
    router.back();
    return;
  }

  router.push(fallback);
}
