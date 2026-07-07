/** Client-side signal to refresh creator "pending ask me" badges after inbox actions. */

export const ASK_ME_PENDING_COUNT_REFRESH = "vippin:ask-me-pending-count-refresh";

export function refreshAskMePendingCount(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ASK_ME_PENDING_COUNT_REFRESH));
}

export function subscribeAskMePendingCountRefresh(
  listener: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(ASK_ME_PENDING_COUNT_REFRESH, listener);
  return () => {
    window.removeEventListener(ASK_ME_PENDING_COUNT_REFRESH, listener);
  };
}
