-- Notification when a Me Pergunte question expires without a creator response.

alter table public.notifications
  drop constraint if exists notifications_type_valid;

alter table public.notifications
  add constraint notifications_type_valid
  check (type in (
    'ask_me_new_question',
    'ask_me_answered',
    'ask_me_refunded',
    'ask_me_payment_confirmed',
    'ask_me_deadline_soon',
    'ask_me_expired',
    'product_purchase_confirmed',
    'product_sale',
    'product_new_comment',
    'product_comment_reply',
    'profile_onboarding_complete',
    'profile_updated',
    'pix_transfer_sent',
    'pix_transfer_failed'
  ));
