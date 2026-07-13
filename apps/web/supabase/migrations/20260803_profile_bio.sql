-- Optional public creator bio (max 120 characters).

alter table public.profiles
  add column if not exists bio text;

alter table public.profiles
  drop constraint if exists profiles_bio_len;

alter table public.profiles
  add constraint profiles_bio_len
  check (bio is null or char_length(bio) <= 120);

-- Expose bio on the public creator view.
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
    bio
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
  bio
) on public.profiles to anon, authenticated;

notify pgrst, 'reload schema';
