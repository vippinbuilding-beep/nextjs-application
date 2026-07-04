-- Make the `products` bucket private.
--
-- Product files (lesson videos and downloadable documents) must never be
-- served from a guessable public URL. After this migration the bytes are only
-- reachable through short-lived signed URLs generated server-side with the
-- service role (see src/app/api/products/[id]/*). Uploads still happen with the
-- anon key, gated by the per-creator RLS write policies below.

update storage.buckets
set public = false
where id = 'products';

-- Drop the anonymous read policy added in 20260706_storage_products.sql. With a
-- private bucket there is no public SELECT: reads go through signed URLs minted
-- by the service role, which bypasses RLS.
drop policy if exists "Product files are publicly readable" on storage.objects;

-- The creator write policies (insert/update/delete, folder = auth.uid()) from
-- 20260706_storage_products.sql remain unchanged and still apply to the
-- presigned upload flow.
