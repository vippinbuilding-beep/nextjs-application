import { supabase } from "@vippin/supabase/client/client";

const askMeRealtimeState = new Map<
  string,
  {
    channel: ReturnType<typeof supabase.channel>;
    listeners: Set<() => void>;
  }
>();

/** Shared realtime channel for creator ask-me question changes (one channel per creator). */
export function subscribeToCreatorAskMeChanges(
  creatorId: string,
  listener: () => void
): () => void {
  let state = askMeRealtimeState.get(creatorId);

  if (!state) {
    const listeners = new Set<() => void>();
    const channel = supabase
      .channel(`creator-pending-ask-me:${creatorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ask_me_questions",
          filter: `creator_id=eq.${creatorId}`,
        },
        () => {
          listeners.forEach((fn) => fn());
        }
      )
      .subscribe();

    state = { channel, listeners };
    askMeRealtimeState.set(creatorId, state);
  }

  state.listeners.add(listener);

  return () => {
    const current = askMeRealtimeState.get(creatorId);
    if (!current) return;

    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      void supabase.removeChannel(current.channel);
      askMeRealtimeState.delete(creatorId);
    }
  };
}
