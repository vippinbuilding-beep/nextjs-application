-- Creator profile photo: uploaded file (avatar_path) or external URL (avatar_url,
-- e.g. Google OAuth picture used as default during onboarding).

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists avatar_mime text,
  add column if not exists avatar_url text;

-- Expose avatar metadata on the public creator view (no PII).
create or replace view public.public_profiles
with (security_invoker = false)
as
  select
    id,
    creator_name,
    name,
    slug,
    socials,
    avatar_path,
    avatar_url
  from public.profiles
  where slug is not null;

grant select on public.public_profiles to anon, authenticated;
