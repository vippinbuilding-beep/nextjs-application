-- Fix Splinter 0010: public.public_profiles was SECURITY DEFINER (default).
--
-- Switch to security_invoker so the view respects RLS. Pair with:
-- 1. A SELECT policy for rows with a public slug
-- 2. Column grants so anon/authenticated cannot read PII from `profiles` directly
-- 3. get_own_profile() for the signed-in user to read their full row (including PII)

-- ── RLS: public creator rows ────────────────────────────────────────────────

drop policy if exists "Anyone can view public creator profiles" on public.profiles;
create policy "Anyone can view public creator profiles"
  on public.profiles for select
  using (slug is not null);

-- ── Column grants (PII only via get_own_profile or service role) ────────────

revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  creator_name,
  name,
  display_name,
  slug,
  socials,
  avatar_path,
  avatar_url,
  ask_me_enabled,
  ask_me_price_cents,
  role,
  onboarding_completed
) on public.profiles to anon, authenticated;

-- ── RPC: full own profile ───────────────────────────────────────────────────

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

revoke all on function public.get_own_profile() from public;
grant execute on function public.get_own_profile() to authenticated;

-- ── View: security invoker ──────────────────────────────────────────────────

create or replace view public.public_profiles
with (security_invoker = true)
as
  select
    id,
    creator_name,
    name,
    slug,
    socials,
    avatar_path,
    avatar_url,
    ask_me_enabled,
    ask_me_price_cents
  from public.profiles
  where slug is not null;

grant select on public.public_profiles to anon, authenticated;
