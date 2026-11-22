-- Envios (etiquetas Melhor Envio) — um por pedido físico.
--
-- `status` espelha o lado da Melhor Envio; o estado de negócio/escrow fica em
-- orders.fulfillment_status. Escrita só via service role (Route Handlers/cron);
-- comprador e criador do pedido leem o próprio envio.

create table if not exists public.shipments (
  id                    uuid        primary key default gen_random_uuid(),
  order_id              uuid        not null unique references public.orders (id) on delete cascade,
  creator_id            uuid        not null references public.profiles (id) on delete cascade,
  buyer_id              uuid        not null references auth.users (id) on delete cascade,
  status                text        not null default 'pending',
  service_id            integer,
  company               text,
  document_type         text,
  invoice_key           text,
  me_order_id           text,
  protocol              text,
  tracking_code         text,
  tracking_url          text,
  package               jsonb,
  cost_cents            integer,
  purchased_at          timestamptz,
  label_printed_at      timestamptz,
  posted_at             timestamptz,
  delivered_at          timestamptz,
  canceled_at           timestamptz,
  last_tracking_sync_at timestamptz,
  error                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.shipments
  drop constraint if exists shipments_status_valid;
alter table public.shipments
  add constraint shipments_status_valid
  check (status in (
    'pending',
    'purchasing',
    'purchase_failed',
    'purchased',
    'printed',
    'posted',
    'delivered',
    'canceled',
    'returned'
  ));

alter table public.shipments
  drop constraint if exists shipments_document_valid;
alter table public.shipments
  add constraint shipments_document_valid
  check (
    (document_type is null or document_type in ('nfe', 'dce'))
    and (invoice_key is null or invoice_key ~ '^\d{44}$')
    and (cost_cents is null or cost_cents >= 0)
  );

create index if not exists shipments_creator_id_idx on public.shipments (creator_id, created_at desc);
create index if not exists shipments_buyer_id_idx on public.shipments (buyer_id, created_at desc);
create index if not exists shipments_me_order_id_idx on public.shipments (me_order_id);
create index if not exists shipments_tracking_code_idx on public.shipments (tracking_code);
create index if not exists shipments_active_idx
  on public.shipments (status, last_tracking_sync_at)
  where status in ('purchased', 'printed', 'posted');

create or replace function public.set_shipments_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists shipments_set_updated_at on public.shipments;
create trigger shipments_set_updated_at
  before update on public.shipments
  for each row
  execute function public.set_shipments_updated_at();

alter table public.shipments enable row level security;

drop policy if exists "Buyers read own shipments" on public.shipments;
create policy "Buyers read own shipments"
  on public.shipments for select
  to authenticated
  using ((select auth.uid()) = buyer_id);

drop policy if exists "Creators read own shipments" on public.shipments;
create policy "Creators read own shipments"
  on public.shipments for select
  to authenticated
  using ((select auth.uid()) = creator_id);

-- Sem policies de insert/update/delete: tudo via service role.

notify pgrst, 'reload schema';
