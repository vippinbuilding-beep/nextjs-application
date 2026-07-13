-- Unique public handle (slug) for creator profiles + unique creator_name.
--
-- The slug is derived from the creator name and is used to build the public
-- profile link later. Both the creator name and the slug must be unique across
-- all profiles, so we enforce that at the database level (defense-in-depth:
-- the browser talks to Supabase directly and client checks can be bypassed).

alter table public.profiles
  add column if not exists slug text;

-- Case-insensitive uniqueness so "Joao" and "joao" can't both be claimed.
create unique index if not exists profiles_creator_name_unique
  on public.profiles (lower(creator_name))
  where creator_name is not null;

create unique index if not exists profiles_slug_unique
  on public.profiles (slug)
  where slug is not null;

-- Atomically returns an available slug based on `desired`. Runs as SECURITY
-- DEFINER so it can check every profile for collisions (RLS would otherwise
-- hide other users' rows). The caller then persists the returned slug; the
-- unique index above is the final guard against races.
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

grant execute on function public.claim_profile_slug(text) to authenticated;
