-- Distinguishes creators (sell content) from consumers (buy/access content).
-- Set once at sign-up via the OAuth callback; existing profiles default to
-- creator so legacy creator accounts keep working.

alter table public.profiles
  add column if not exists role text not null default 'creator';

alter table public.profiles
  drop constraint if exists profiles_role_valid;
alter table public.profiles
  add constraint profiles_role_valid
  check (role in ('creator', 'consumer'));

-- Only creators may create/update/delete products (defense-in-depth: the UI
-- also hides creator tooling for consumers).
drop policy if exists "Creators can insert own products" on public.products;
create policy "Creators can insert own products"
  on public.products for insert
  with check (
    auth.uid() = creator_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'creator'
    )
  );

drop policy if exists "Creators can update own products" on public.products;
create policy "Creators can update own products"
  on public.products for update
  using (
    auth.uid() = creator_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'creator'
    )
  )
  with check (
    auth.uid() = creator_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'creator'
    )
  );

drop policy if exists "Creators can delete own products" on public.products;
create policy "Creators can delete own products"
  on public.products for delete
  using (
    auth.uid() = creator_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'creator'
    )
  );
