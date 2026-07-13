-- Threaded comments on products. Only users with product access (creator or
-- product_accesses row) may read/write; authors and product creators may delete.

create table if not exists public.product_comments (
  id          uuid        primary key default gen_random_uuid(),
  product_id  uuid        not null references public.products (id) on delete cascade,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  parent_id   uuid        references public.product_comments (id) on delete cascade,
  body        text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists product_comments_product_id_created_at_idx
  on public.product_comments (product_id, created_at);

create index if not exists product_comments_parent_id_idx
  on public.product_comments (parent_id);

alter table public.product_comments
  drop constraint if exists product_comments_body_len;
alter table public.product_comments
  add constraint product_comments_body_len
  check (char_length(body) between 1 and 500);

-- True when the caller is the product creator or has an entitlement row.
create or replace function public.user_has_product_access(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.products p
    where p.id = p_product_id
      and p.creator_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.product_accesses pa
    where pa.product_id = p_product_id
      and pa.user_id = (select auth.uid())
  );
$$;

revoke all on function public.user_has_product_access(uuid) from public;
grant execute on function public.user_has_product_access(uuid) to authenticated;

-- Replies must belong to the same product as their parent comment.
create or replace function public.enforce_product_comment_parent()
returns trigger
language plpgsql
as $$
declare
  parent_product_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select product_id into parent_product_id
  from public.product_comments
  where id = new.parent_id;

  if parent_product_id is null then
    raise exception 'Comentário pai não encontrado.';
  end if;

  if parent_product_id is distinct from new.product_id then
    raise exception 'A resposta precisa ser no mesmo produto.';
  end if;

  return new;
end;
$$;

drop trigger if exists product_comments_parent_integrity on public.product_comments;
create trigger product_comments_parent_integrity
  before insert or update of parent_id, product_id
  on public.product_comments
  for each row
  execute function public.enforce_product_comment_parent();

alter table public.product_comments enable row level security;

drop policy if exists "Product access can read comments" on public.product_comments;
create policy "Product access can read comments"
  on public.product_comments for select
  to authenticated
  using (public.user_has_product_access(product_id));

drop policy if exists "Product access can insert own comments" on public.product_comments;
create policy "Product access can insert own comments"
  on public.product_comments for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.user_has_product_access(product_id)
  );

drop policy if exists "Author or creator can delete comments" on public.product_comments;
create policy "Author or creator can delete comments"
  on public.product_comments for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.creator_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
