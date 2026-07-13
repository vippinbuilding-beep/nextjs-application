-- Public read access to creator profiles, without leaking PII.
--
-- The `profiles` table stays locked down to its owner (RLS: auth.uid() = id) so
-- the browser (anon key) can never read another user's email, pix_key or
-- birth_date directly. But the public creator page (/@slug) and product page
-- (/@slug/product) must be readable by anyone, including logged-out visitors.
--
-- We expose only the safe, public columns through this view. The view runs with
-- its owner's privileges (security_invoker = false, the default), so it bypasses
-- the base table's owner-only RLS — and since it selects a fixed, curated set of
-- columns, no sensitive field can leak. Querying `profiles` directly with the
-- anon key still only returns the caller's own row.

create or replace view public.public_profiles
with (security_invoker = false)
as
  select
    id,
    creator_name,
    name,
    slug,
    socials
  from public.profiles
  where slug is not null;

grant select on public.public_profiles to anon, authenticated;
