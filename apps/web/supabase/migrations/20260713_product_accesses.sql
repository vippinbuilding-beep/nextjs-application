-- Relates products to the users who own/purchased them (entitlements).
--
-- The product's creator always has implicit access to their own product; this
-- table records access granted to *other* users (e.g. after a future PIX
-- payment). Gating on the public product page checks: is the viewer the creator
-- OR does an access row exist for (viewer, product).
--
-- The browser talks to Supabase with the anon key, so RLS is the real guard:
--   * a viewer may only read their own access rows;
--   * only the product's creator may grant/revoke access to their products.
-- There is deliberately no self-insert path for arbitrary users — otherwise the
-- gate would be meaningless. Payment-driven grants will run server-side (service
-- role) once PIX is wired up.

create table if not exists public.product_accesses (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  product_id  uuid        not null references public.products (id) on delete cascade,
  -- How the access was granted. `purchase` is reserved for future PIX flow.
  source      text        not null default 'manual',
  granted_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists product_accesses_product_id_idx
  on public.product_accesses (product_id);

create index if not exists product_accesses_user_id_idx
  on public.product_accesses (user_id);

alter table public.product_accesses
  drop constraint if exists product_accesses_source_valid;
alter table public.product_accesses
  add constraint product_accesses_source_valid
  check (source in ('manual', 'purchase', 'free'));

alter table public.product_accesses enable row level security;

-- Viewers read their own grants; creators read grants for their own products.
drop policy if exists "Read own or owned product access" on public.product_accesses;
create policy "Read own or owned product access"
  on public.product_accesses for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.products p
      where p.id = product_id
        and p.creator_id = (select auth.uid())
    )
  );

-- Only the product's creator may grant access to their product.
drop policy if exists "Creators grant access to own products" on public.product_accesses;
create policy "Creators grant access to own products"
  on public.product_accesses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and p.creator_id = (select auth.uid())
    )
  );

-- Only the product's creator may revoke access to their product.
drop policy if exists "Creators revoke access to own products" on public.product_accesses;
create policy "Creators revoke access to own products"
  on public.product_accesses for delete
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and p.creator_id = (select auth.uid())
    )
  );
