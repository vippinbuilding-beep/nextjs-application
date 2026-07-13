-- Splinter fixes:
-- 0011 function_search_path_mutable — pin search_path on trigger helpers
-- 0028 anon_security_definer_function_executable — revoke EXECUTE from anon/public
-- 0029 user_has_product_access — move to private schema (RLS helper, not a public RPC)

-- ── Trigger helpers: immutable search_path ────────────────────────────────────

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_product_progresses_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_profile_links_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_ask_me_questions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.enforce_product_comment_parent()
returns trigger
language plpgsql
set search_path = public
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

-- ── RLS helper: not exposed via PostgREST ───────────────────────────────────

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.user_has_product_access(p_product_id uuid)
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

revoke all on function private.user_has_product_access(uuid) from public;
grant execute on function private.user_has_product_access(uuid) to authenticated;

drop policy if exists "Product access can read comments" on public.product_comments;
create policy "Product access can read comments"
  on public.product_comments for select
  to authenticated
  using (private.user_has_product_access(product_id));

drop policy if exists "Product access can insert own comments" on public.product_comments;
create policy "Product access can insert own comments"
  on public.product_comments for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and private.user_has_product_access(product_id)
  );

drop function if exists public.user_has_product_access(uuid);

-- ── Public RPCs: authenticated only (never anon) ────────────────────────────

create or replace function public.claim_profile_slug(desired text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix int := 1;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  base := regexp_replace(lower(coalesce(desired, '')), '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  if base = '' then
    base := 'criador';
  end if;

  candidate := base;
  while exists (
    select 1
    from public.profiles
    where slug = candidate
      and id <> auth.uid()
  ) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;

  return candidate;
end;
$$;

create or replace function public.claim_product_slug(desired text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix int := 1;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  base := regexp_replace(lower(coalesce(desired, '')), '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  if base = '' then
    base := 'produto';
  end if;

  candidate := base;
  while exists (
    select 1
    from public.products
    where creator_id = auth.uid()
      and slug = candidate
  ) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;

  return candidate;
end;
$$;

create or replace function public.get_own_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.claim_profile_slug(text) from public, anon;
revoke all on function public.claim_product_slug(text) from public, anon;
revoke all on function public.get_own_profile() from public, anon;

grant execute on function public.claim_profile_slug(text) to authenticated;
grant execute on function public.claim_product_slug(text) to authenticated;
grant execute on function public.get_own_profile() to authenticated;

notify pgrst, 'reload schema';
