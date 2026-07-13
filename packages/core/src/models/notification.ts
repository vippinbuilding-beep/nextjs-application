export type NotificationType =
  | "ask_me_new_question"
  | "ask_me_answered"
  | "ask_me_refunded"
  | "ask_me_payment_confirmed"
  | "ask_me_deadline_soon"
  | "ask_me_expired"
  | "product_purchase_confirmed"
  | "product_sale"
  | "product_access_granted"
  | "product_free_claim"
  | "product_new_comment"
  | "product_comment_reply"
  | "profile_onboarding_complete"
  | "profile_updated"
  | "pix_transfer_sent"
  | "pix_transfer_failed";

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
