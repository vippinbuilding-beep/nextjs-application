import type { AppNotification, NotificationType } from "@/core/models/notification";
import { supabase } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string | null;
};

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    href: row.href ?? undefined,
    metadata: row.metadata ?? {},
    readAt: row.read_at ? new Date(row.read_at) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  };
}

const notificationRealtimeState = new Map<
  string,
  {
    channel: ReturnType<typeof supabase.channel>;
    listeners: Set<(notification: AppNotification) => void>;
  }
>();

/** Subscribes to new in-app notifications for a user (shared Supabase channel). */
export function subscribeToNotificationInserts(
  userId: string,
  listener: (notification: AppNotification) => void
): () => void {
  let state = notificationRealtimeState.get(userId);

  if (!state) {
    const listeners = new Set<(notification: AppNotification) => void>();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow | null;
          if (!row?.id) return;
          const notification = toNotification(row);
          listeners.forEach((fn) => fn(notification));
        }
      )
      .subscribe();

    state = { channel, listeners };
    notificationRealtimeState.set(userId, state);
  }

  state.listeners.add(listener);

  return () => {
    state!.listeners.delete(listener);
    if (state!.listeners.size === 0) {
      void supabase.removeChannel(state!.channel);
      notificationRealtimeState.delete(userId);
    }
  };
}
