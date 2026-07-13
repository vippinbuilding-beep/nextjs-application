const STORAGE_KEY = "vippin:in-app-navigation";
const OAUTH_DEPARTURE_KEY = "vippin:oauth-departure";

let previousPathname: string | null = null;

export function markInAppNavigation(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, "1");
}

export function hasInAppNavigation(): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }

  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

/** Set before OAuth redirect so back stays hidden until the user navigates in-app. */
export function markOAuthDeparture(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.setItem(OAUTH_DEPARTURE_KEY, "1");
  sessionStorage.removeItem(STORAGE_KEY);
  previousPathname = null;
}

export function hasOAuthDeparture(): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }

  return sessionStorage.getItem(OAUTH_DEPARTURE_KEY) === "1";
}

function clearOAuthDeparture(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem(OAUTH_DEPARTURE_KEY);
}

export function clearNavigationHistory(): void {
  clearOAuthDeparture();

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  previousPathname = null;
}

/** Records client-side route changes so back works after in-app navigation. */
export function trackPathnameChange(pathname: string): void {
  if (previousPathname !== null && previousPathname !== pathname) {
    clearOAuthDeparture();
    markInAppNavigation();
  }

  previousPathname = pathname;
}

export function canNavigateBack(hasSameOriginAppReferrer: boolean): boolean {
  if (hasOAuthDeparture() && !hasInAppNavigation()) {
    return false;
  }

  if (hasSameOriginAppReferrer || hasInAppNavigation()) {
    return true;
  }

  return false;
}
