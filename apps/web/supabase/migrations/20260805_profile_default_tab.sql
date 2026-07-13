-- Creator preference for which tab opens first on the public profile page.

alter table public.profiles
  add column if not exists profile_default_tab text;

alter table public.profiles
  drop constraint if exists profiles_profile_default_tab_valid;

alter table public.profiles
  add constraint profiles_profile_default_tab_valid
  check (
    profile_default_tab is null
    or profile_default_tab in ('links', 'lessons', 'documents')
  );

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
    ask_me_price_cents,
    bio,
    profile_default_tab
  from public.profiles
  where slug is not null;

grant select on public.public_profiles to anon, authenticated;

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
  onboarding_completed,
  bio,
  profile_default_tab
) on public.profiles to anon, authenticated;

notify pgrst, 'reload schema';
