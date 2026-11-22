-- Ledger de ajustes de frete (divergências) e trilha de auditoria do escrow.
--
-- shipping_adjustments: diferença entre frete cotado e custo real, divergência
-- de medidas cobrada pela transportadora, frete perdido em devolução. `charged_to`
-- diz quem absorve: plataforma ou criador (ajuste debita o próximo saque).
--
-- fulfillment_events: toda transição de orders.fulfillment_status (sistema,
-- criador ou admin), com autor — exigência dos overrides do admin.
--
-- Ambas só via service role (sem policies).

create table if not exists public.shipping_adjustments (
  id           uuid        primary key default gen_random_uuid(),
  order_id     uuid        not null references public.orders (id) on delete cascade,
  creator_id   uuid        not null references public.profiles (id) on delete cascade,
  kind         text        not null,
  amount_cents integer     not null,
  charged_to   text        not null,
  settled_at   timestamptz,
  note         text,
  created_by   uuid        references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.shipping_adjustments
  drop constraint if exists shipping_adjustments_valid;
alter table public.shipping_adjustments
  add constraint shipping_adjustments_valid
  check (
    kind in ('price_divergence', 'carrier_divergence', 'package_change', 'return_cost')
    and charged_to in ('platform', 'creator')
    and amount_cents <> 0
    and (note is null or char_length(note) <= 500)
  );

create index if not exists shipping_adjustments_order_idx
  on public.shipping_adjustments (order_id);
create index if not exists shipping_adjustments_creator_open_idx
  on public.shipping_adjustments (creator_id)
  where charged_to = 'creator' and settled_at is null;

alter table public.shipping_adjustments enable row level security;

create table if not exists public.fulfillment_events (
  id          uuid        primary key default gen_random_uuid(),
  order_id    uuid        not null references public.orders (id) on delete cascade,
  from_status text        not null,
  to_status   text        not null,
  actor       text        not null,
  actor_id    uuid        references auth.users (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

alter table public.fulfillment_events
  drop constraint if exists fulfillment_events_actor_valid;
alter table public.fulfillment_events
  add constraint fulfillment_events_actor_valid
  check (actor in ('system', 'creator', 'admin'));

create index if not exists fulfillment_events_order_idx
  on public.fulfillment_events (order_id, created_at);

alter table public.fulfillment_events enable row level security;

notify pgrst, 'reload schema';
