import { AlertTriangle, Banknote, Bell, type LucideIcon } from "lucide-react";

import type { NotificationType } from "@vippin/core/models/notification";

export type NotificationTone = "default" | "financial" | "financial-error";

const FINANCIAL_SUCCESS_TYPES = new Set<NotificationType>([
  "pix_transfer_sent",
  "product_sale",
  "ask_me_new_question",
  "physical_sale",
  "order_released",
]);

/** Visual tone for in-app notification surfaces (bell list + toast). */
export function getNotificationTone(type: NotificationType): NotificationTone {
  if (type === "pix_transfer_failed" || type === "shipment_problem") return "financial-error";
  if (FINANCIAL_SUCCESS_TYPES.has(type)) return "financial";
  return "default";
}

/**
 * Aparência de cada tom, igual na lista do sininho e no aviso (toast): só o
 * ícone muda de cor; a superfície é sempre a mesma (cartão do tema). Só
 * tokens, então funciona nos temas claro e escuro.
 */
export const NOTIFICATION_TONE_STYLES: Record<
  NotificationTone,
  { icon: LucideIcon; iconClassName: string }
> = {
  default: {
    icon: Bell,
    iconClassName: "bg-primary text-primary-foreground",
  },
  financial: {
    icon: Banknote,
    iconClassName: "bg-success/15 text-success",
  },
  "financial-error": {
    icon: AlertTriangle,
    iconClassName: "bg-destructive/12 text-destructive",
  },
};
