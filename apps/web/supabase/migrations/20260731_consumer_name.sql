-- Separate consumer identity from creator fields.
-- Consumers use consumer_name; creators keep name (legal) + creator_name (public).

alter table public.profiles
  add column if not exists consumer_name text;

-- Backfill from legacy consumer `name`, then clear creator-only columns.
update public.profiles
set consumer_name = name
where role = 'consumer'
  and consumer_name is null
  and name is not null;

update public.profiles
set
  name = null,
  creator_name = null,
  slug = null,
  birth_date = null,
  pix_key = null,
  pix_key_type = null,
  socials = '{}'::jsonb,
  ask_me_enabled = false,
  ask_me_price_cents = null
where role = 'consumer';

-- Length constraints
alter table public.profiles
  drop constraint if exists profiles_consumer_name_len;
alter table public.profiles
  add constraint profiles_consumer_name_len
  check (consumer_name is null or char_length(consumer_name) between 3 and 80) not valid;

-- Role-shaped rows (defense-in-depth)
alter table public.profiles
  drop constraint if exists profiles_consumer_shape;
alter table public.profiles
  add constraint profiles_consumer_shape
  check (
    role <> 'consumer'
    or (
      creator_name is null
      and slug is null
      and birth_date is null
      and pix_key is null
      and pix_key_type is null
      and coalesce(ask_me_enabled, false) = false
      and ask_me_price_cents is null
    )
  ) not valid;

alter table public.profiles
  drop constraint if exists profiles_consumer_onboarding;
alter table public.profiles
  add constraint profiles_consumer_onboarding
  check (
    role <> 'consumer'
    or coalesce(onboarding_completed, false) = false
    or consumer_name is not null
  ) not valid;

alter table public.profiles
  drop constraint if exists profiles_creator_onboarding;
alter table public.profiles
  add constraint profiles_creator_onboarding
  check (
    role <> 'creator'
    or coalesce(onboarding_completed, false) = false
    or (
      name is not null
      and creator_name is not null
      and slug is not null
      and birth_date is not null
      and pix_key is not null
    )
  ) not valid;

-- Column grants: expose consumer_name for limited authenticated reads
revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  creator_name,
  consumer_name,
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

-- Comment / ask-me author previews (consumers have no slug)
create or replace view public.public_profile_previews
with (security_invoker = true)
as
  select
    id,
    creator_name,
    consumer_name,
    name,
    slug,
    avatar_path,
    avatar_url
  from public.profiles;

grant select on public.public_profile_previews to anon, authenticated;

notify pgrst, 'reload schema';
