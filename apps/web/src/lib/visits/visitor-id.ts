const VISITOR_ID_KEY = "vippin:visitor-id";

/**
 * Returns this browser's stable visitor id, creating and persisting one on the
 * first call. Saved in localStorage so the same browser is recognized across
 * visits and counts at most once per target ("exact" visit tracking). Clearing
 * storage or using another browser yields a new id — that's expected.
 */
export function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    // localStorage indisponível (modo restrito): sem id estável, não contamos.
    return null;
  }
}

/**
 * Tracks, per browser, which targets have already been counted so we don't even
 * re-POST for a target this browser already visited. The server deduplicates
 * regardless; this just avoids redundant requests.
 */
export function hasVisited(scope: "creator" | "product", id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`vippin:visited:${scope}:${id}`) === "1";
  } catch {
    return false;
  }
}

export function markVisited(scope: "creator" | "product", id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`vippin:visited:${scope}:${id}`, "1");
  } catch {
    // Ignora: no pior caso reenviamos o POST e o servidor deduplica.
  }
}
