import { supabase } from "@/lib/supabase/client";
import type { AppNotification, NotificationType } from "@/core/models/notification";
import type { NotificationRepository } from "@/core/repositories/notification-repository";

const TABLE = "notifications";

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

export class SupabaseNotificationRepository implements NotificationRepository {
  async listRecent(userId: string, limit = 20): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return ((data as NotificationRow[]) ?? []).map(toNotification);
  }

  async countUnread(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
    if (error) throw new Error(error.message);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
  }
}

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
