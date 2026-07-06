const STORAGE_KEY = "vippin:pwa-install-prompt";
/** @deprecated Migrated to {@link STORAGE_KEY}. */
const LEGACY_DISMISS_KEY = "vippin:pwa-install-dismissed";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type InstallPromptState =
  | { status: "permanent" }
  | { status: "snoozed"; until: number };

function readState(): InstallPromptState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as InstallPromptState;
      if (parsed.status === "permanent" || parsed.status === "snoozed") {
        return parsed;
      }
    }
  } catch {
    // ignore corrupt value
  }

  if (localStorage.getItem(LEGACY_DISMISS_KEY) === "1") {
    return { status: "permanent" };
  }

  return null;
}

/** Whether the install banner may be shown now. */
export function shouldShowInstallPrompt(): boolean {
  const state = readState();
  if (!state) return true;
  if (state.status === "permanent") return false;
  return Date.now() >= state.until;
}

/** User closed the banner — hide again for one week. */
export function snoozeInstallPromptOneWeek(): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      status: "snoozed",
      until: Date.now() + ONE_WEEK_MS,
    } satisfies InstallPromptState)
  );
  localStorage.removeItem(LEGACY_DISMISS_KEY);
}

/** User chose to install — never show the banner again. */
export function dismissInstallPromptPermanently(): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ status: "permanent" } satisfies InstallPromptState)
  );
  localStorage.removeItem(LEGACY_DISMISS_KEY);
}
