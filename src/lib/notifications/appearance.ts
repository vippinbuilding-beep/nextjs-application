import type { NotificationType } from "@/core/models/notification";

export type NotificationTone = "default" | "financial" | "financial-error";

const FINANCIAL_SUCCESS_TYPES = new Set<NotificationType>([
  "pix_transfer_sent",
  "product_sale",
  "ask_me_new_question",
]);

/** Visual tone for in-app notification surfaces (dialog list + toast). */
export function getNotificationTone(type: NotificationType): NotificationTone {
  if (type === "pix_transfer_failed") return "financial-error";
  if (FINANCIAL_SUCCESS_TYPES.has(type)) return "financial";
  return "default";
}

export const NOTIFICATION_TONE_STYLES: Record<
  NotificationTone,
  {
    itemUnread: string;
    itemInteractive: string;
    toast: string;
    icon: string;
  }
> = {
  default: {
    itemUnread: "bg-primary/10",
    itemInteractive: "hover:bg-muted/50 active:bg-muted/50",
    toast: "border-border bg-background",
    icon: "border-border bg-primary text-foreground",
  },
  financial: {
    itemUnread: "bg-green-100",
    itemInteractive: "hover:bg-green-50 active:bg-green-50",
    toast: "border-green-600 bg-green-50",
    icon: "border-green-600 bg-green-100 text-green-800",
  },
  "financial-error": {
    itemUnread: "bg-destructive/10",
    itemInteractive: "hover:bg-destructive/5 active:bg-destructive/5",
    toast: "border-destructive bg-destructive/5",
    icon: "border-destructive bg-destructive/10 text-destructive",
  },
};
