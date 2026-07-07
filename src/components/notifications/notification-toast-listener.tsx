"use client";

import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import type { AppNotification } from "@/core/models/notification";
import { getNotificationTone } from "@/lib/notifications/appearance";
import { subscribeToNotificationInserts } from "@/lib/notifications/realtime";
import { toast } from "@/lib/toast";
import { notificationRepository } from "@/services/repository-factory";

const toastedNotificationIds = new Set<string>();

function showNotificationToast(notification: AppNotification): void {
  if (toastedNotificationIds.has(notification.id)) return;
  toastedNotificationIds.add(notification.id);
  toast.notification({
    title: notification.title,
    body: notification.body,
    href: notification.href,
    notificationTone: getNotificationTone(notification.type),
  });
}

/**
 * Shows a toast whenever a new in-app notification is inserted for the signed-in user.
 * On mobile, replays unread toasts when the tab regains focus.
 */
export function NotificationToastListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || !user.onboardingCompleted) return;

    const userId = user.id;
    let cancelled = false;
    let seeded = false;

    async function seedExisting() {
      try {
        const recent = await notificationRepository.listRecent(userId, 20);
        if (cancelled) return;
        for (const notification of recent) {
          toastedNotificationIds.add(notification.id);
        }
        seeded = true;
      } catch {
        seeded = true;
      }
    }

    void seedExisting();

    const unsubscribe = subscribeToNotificationInserts(userId, (notification) => {
      if (!seeded) return;
      showNotificationToast(notification);
    });

    async function flushMissedWhileHidden() {
      if (document.visibilityState !== "visible" || !seeded) return;
      try {
        const recent = await notificationRepository.listRecent(userId, 10);
        for (const notification of recent) {
          if (notification.readAt) {
            toastedNotificationIds.add(notification.id);
            continue;
          }
          showNotificationToast(notification);
        }
      } catch {
        // ignore transient errors
      }
    }

    function handleVisible() {
      if (document.visibilityState === "visible") {
        void flushMissedWhileHidden();
      }
    }

    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", flushMissedWhileHidden);
    window.addEventListener("pageshow", flushMissedWhileHidden);

    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", flushMissedWhileHidden);
      window.removeEventListener("pageshow", flushMissedWhileHidden);
    };
  }, [user?.id, user?.onboardingCompleted]);

  return null;
}
