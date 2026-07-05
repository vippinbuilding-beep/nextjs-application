export type NotificationType =
  | "ask_me_new_question"
  | "ask_me_answered"
  | "ask_me_refunded"
  | "ask_me_payment_confirmed"
  | "ask_me_deadline_soon";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  metadata: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
}
