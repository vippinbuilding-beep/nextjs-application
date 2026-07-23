-- Products get a status column so creators can cancel a product without a
-- cascade delete: cancelled products stay in the DB (comments, buyer access,
-- history all remain intact) but are hidden from everyone except the owner.

alter table public.products
  add column if not exists status text not null default 'active';

alter table public.products
  drop constraint if exists products_status_valid;
alter table public.products
  add constraint products_status_valid
  check (status in ('active', 'cancelled'));

create index if not exists products_status_idx
  on public.products (status);

-- A cancelled product returns 404 to everyone except its creator and buyers
-- who already have access (their purchase isn't revoked by a cancellation).
drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select
  using (
    status = 'active'
    or auth.uid() = creator_id
    or exists (
      select 1 from public.product_accesses pa
      where pa.product_id = products.id
        and pa.user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
