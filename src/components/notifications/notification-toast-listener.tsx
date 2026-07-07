"use client";

import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { subscribeToNotificationInserts } from "@/lib/notifications/realtime";
import { toast } from "@/lib/toast";

/**
 * Shows a toast whenever a new in-app notification is inserted for the signed-in user.
 */
export function NotificationToastListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || !user.onboardingCompleted) return;

    return subscribeToNotificationInserts(user.id, (notification) => {
      toast.notification({
        title: notification.title,
        body: notification.body,
        href: notification.href,
      });
    });
  }, [user?.id, user?.onboardingCompleted]);

  return null;
}
