-- Direito de arrependimento (CDC art. 49): o comprador pede a devolução em até
-- 7 dias após a entrega. Um pedido aberto marca orders.admin_hold_at, que já
-- bloqueia a liberação automática do escrow; o admin resolve no dashboard
-- (reembolsar + cobrar o frete do criador, ou recusar).
--
-- Escrita só pelo servidor (service role): o Route Handler valida dono, prazo
-- e estado do pedido. Comprador e criador só leem os próprios.

create table if not exists public.order_return_requests (
  id              uuid        primary key default gen_random_uuid(),
  order_id        uuid        not null unique references public.orders (id) on delete cascade,
  buyer_id        uuid        not null references auth.users (id) on delete cascade,
  creator_id      uuid        not null references public.profiles (id) on delete cascade,
  reason          text        not null,
  status          text        not null default 'open',
  resolution_note text,
  requested_at    timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid        references auth.users (id) on delete set null,
  last_alerted_at timestamptz,
  constraint order_return_requests_reason_valid
    check (char_length(btrim(reason)) between 10 and 1000),
  constraint order_return_requests_status_valid
    check (status in ('open', 'refunded', 'rejected')),
  constraint order_return_requests_resolution_valid
    check ((status = 'open') = (resolved_at is null)),
  constraint order_return_requests_note_valid
    check (resolution_note is null or char_length(resolution_note) <= 500)
);

create index if not exists order_return_requests_open_idx
  on public.order_return_requests (requested_at)
  where status = 'open';
create index if not exists order_return_requests_creator_idx
  on public.order_return_requests (creator_id, requested_at desc);

alter table public.order_return_requests enable row level security;

drop policy if exists "Buyers read own return requests" on public.order_return_requests;
create policy "Buyers read own return requests"
  on public.order_return_requests for select
  using (auth.uid() = buyer_id);

drop policy if exists "Creators read own return requests" on public.order_return_requests;
create policy "Creators read own return requests"
  on public.order_return_requests for select
  using (auth.uid() = creator_id);

-- O comprador vira um ator do histórico do escrow (pedido de devolução).
alter table public.fulfillment_events
  drop constraint if exists fulfillment_events_actor_valid;
alter table public.fulfillment_events
  add constraint fulfillment_events_actor_valid
  check (actor in ('system', 'creator', 'admin', 'buyer'));

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
    'product_access_granted',
    'product_free_claim',
    'product_new_comment',
    'product_comment_reply',
    'profile_onboarding_complete',
    'profile_updated',
    'pix_transfer_sent',
    'pix_transfer_failed',
    'physical_order_paid',
    'physical_sale',
    'shipment_deadline_soon',
    'shipment_label_ready',
    'shipment_posted',
    'shipment_delivered',
    'shipment_problem',
    'order_released',
    'order_refunded',
    'order_return_requested'
  ));

notify pgrst, 'reload schema';
