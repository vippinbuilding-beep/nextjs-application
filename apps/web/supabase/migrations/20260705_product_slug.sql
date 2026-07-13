-- Unique product slug generation, scoped per creator.
-- Must run AFTER the products table migration (20260704).

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

grant execute on function public.claim_product_slug(text) to authenticated;

-- Refresh PostgREST schema cache so the RPC is immediately callable.
notify pgrst, 'reload schema';
