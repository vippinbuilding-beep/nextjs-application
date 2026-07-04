-- Orders: records a PIX purchase of a product and the platform/creator split.
--
-- Flow (see src/lib/payments): a logged-in buyer creates an order, we open a
-- transparent PIX charge on AbacatePay for the full price, and once it is
-- confirmed we (1) grant the buyer access (product_accesses row, source
-- 'purchase') and (2) repass the creator's share via a third-party PIX transfer
-- (AbacatePay `/pix/send`). The platform's 10% simply stays in the account
-- balance — AbacatePay does not offer automatic split yet, so we do it manually.
--
-- Money is always in integer cents. The split is enforced at the DB level:
--   amount_cents = platform_fee_cents + creator_amount_cents.
--
-- The browser talks to Supabase with the anon key, so RLS is the real guard:
--   * the buyer may read only their own orders;
--   * the creator may read orders for their own products.
-- There is deliberately NO insert/update path for the anon/authenticated roles:
-- every write happens server-side with the service role (Route Handlers), so a
-- client can never forge an order, tamper with the amount or flip the status.

create table if not exists public.orders (
  id                   uuid        primary key default gen_random_uuid(),
  product_id           uuid        not null references public.products (id) on delete cascade,
  buyer_id             uuid        not null references auth.users (id) on delete cascade,
  creator_id           uuid        not null references public.profiles (id) on delete cascade,
  -- Full price charged to the buyer and its split (all in cents).
  amount_cents         integer     not null,
  platform_fee_cents   integer     not null,
  creator_amount_cents integer     not null,
  -- Charge lifecycle on our side.
  status               text        not null default 'pending',
  -- AbacatePay transparent PIX charge (QR code) identifiers/artifacts.
  abacate_charge_id    text,
  br_code              text,
  br_code_base64       text,
  expires_at           timestamptz,
  paid_at              timestamptz,
  -- Repass of the creator's 90% via AbacatePay `/pix/send`.
  transfer_status      text        not null default 'pending',
  abacate_transfer_id  text,
  transfer_error       text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_product_id_idx on public.orders (product_id);
create index if not exists orders_creator_id_idx on public.orders (creator_id);
create index if not exists orders_abacate_charge_id_idx on public.orders (abacate_charge_id);

alter table public.orders
  drop constraint if exists orders_status_valid;
alter table public.orders
  add constraint orders_status_valid
  check (status in ('pending', 'paid', 'expired', 'refunded', 'failed'));

alter table public.orders
  drop constraint if exists orders_transfer_status_valid;
alter table public.orders
  add constraint orders_transfer_status_valid
  check (transfer_status in ('pending', 'sent', 'failed'));

alter table public.orders
  drop constraint if exists orders_amounts_positive;
alter table public.orders
  add constraint orders_amounts_positive
  check (
    amount_cents > 0
    and platform_fee_cents >= 0
    and creator_amount_cents >= 0
  );

-- The split must always add up: no cents may be created or lost.
alter table public.orders
  drop constraint if exists orders_split_sums;
alter table public.orders
  add constraint orders_split_sums
  check (amount_cents = platform_fee_cents + creator_amount_cents);

create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_orders_updated_at();

alter table public.orders enable row level security;

-- Buyers read their own orders (to poll payment status from the browser).
drop policy if exists "Buyers read own orders" on public.orders;
create policy "Buyers read own orders"
  on public.orders for select
  to authenticated
  using ((select auth.uid()) = buyer_id);

-- Creators read orders placed for their own products (dashboards/reconciliation).
drop policy if exists "Creators read orders for own products" on public.orders;
create policy "Creators read orders for own products"
  on public.orders for select
  to authenticated
  using ((select auth.uid()) = creator_id);

-- No insert/update/delete policies on purpose: all writes go through the service
-- role in Route Handlers, which bypasses RLS. This keeps amounts and statuses
-- server-authoritative.
