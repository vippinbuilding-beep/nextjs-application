-- Splinter 0029: remove SECURITY DEFINER RPCs from the public (PostgREST) schema.
-- Slug claiming and full profile reads now go through Next.js Route Handlers.

drop function if exists public.claim_profile_slug(text);
drop function if exists public.claim_product_slug(text);
drop function if exists public.get_own_profile();

notify pgrst, 'reload schema';
