-- Profile writes from the browser are blocked; reads stay column-scoped + RLS.
--
-- After 20260726, anon/authenticated lost table-level SELECT on `profiles` and
-- only received grants on public columns. Client-side upsert/update during
-- onboarding still hit `profiles` directly and failed with
-- "permission denied for table profiles".
--
-- Writes (including PII like email, pix_key, birth_date) now go through Next.js
-- Route Handlers that use the service role (`/api/profile/me`, OAuth callback).
-- Revoke INSERT/UPDATE/DELETE from browser roles so the table stays protected.

revoke insert, update, delete on public.profiles from anon, authenticated;

notify pgrst, 'reload schema';
