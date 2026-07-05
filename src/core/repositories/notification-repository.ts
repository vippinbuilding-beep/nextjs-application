import type { AppNotification } from "@/core/models/notification";

export interface NotificationRepository {
  listRecent(userId: string, limit?: number): Promise<AppNotification[]>;
  countUnread(userId: string): Promise<number>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
}
