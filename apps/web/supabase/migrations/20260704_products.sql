-- Products table.
-- A product belongs to a creator (profiles row) and is exposed on a public
-- page at /@<creator slug>/<product slug>. Two kinds exist for now:
--   * single_lesson: a single video lesson (uploaded video file)
--   * document:       a downloadable document (pdf/docx/xlsx/pptx/...)
--
-- The uploaded file lives in the `products` Storage bucket; only its metadata
-- (path, name, mime, size) is stored here. Price is always in cents.

create table if not exists public.products (
  id           uuid        primary key default gen_random_uuid(),
  creator_id   uuid        not null references public.profiles (id) on delete cascade,
  type         text        not null,
  title        text        not null,
  description  text,
  price_cents  integer     not null default 0,
  slug         text        not null,
  file_path    text,
  file_name    text,
  file_mime    text,
  file_size    bigint,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (creator_id, slug)
);

create index if not exists products_creator_id_idx
  on public.products (creator_id);

alter table public.products
  drop constraint if exists products_type_valid;
alter table public.products
  add constraint products_type_valid
  check (type in ('single_lesson', 'document'));

alter table public.products
  drop constraint if exists products_title_len;
alter table public.products
  add constraint products_title_len
  check (char_length(title) between 2 and 120);

alter table public.products
  drop constraint if exists products_description_len;
alter table public.products
  add constraint products_description_len
  check (description is null or char_length(description) <= 2000);

alter table public.products
  drop constraint if exists products_price_cents_positive;
alter table public.products
  add constraint products_price_cents_positive
  check (price_cents >= 0);

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_products_updated_at();

alter table public.products enable row level security;

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select
  using (true);

drop policy if exists "Creators can insert own products" on public.products;
create policy "Creators can insert own products"
  on public.products for insert
  with check (auth.uid() = creator_id);

drop policy if exists "Creators can update own products" on public.products;
create policy "Creators can update own products"
  on public.products for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

drop policy if exists "Creators can delete own products" on public.products;
create policy "Creators can delete own products"
  on public.products for delete
  using (auth.uid() = creator_id);
