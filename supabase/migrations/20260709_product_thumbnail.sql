-- Optional product thumbnail (shown on the product page, dashboard and
-- creator's public profile). When absent, the UI falls back to a generic
-- icon based on the product type. The file itself lives in the same
-- `products` Storage bucket (existing per-user RLS policies already cover
-- any path under `{userId}/...`), only its metadata is stored here.

alter table public.products
  add column if not exists thumbnail_path text,
  add column if not exists thumbnail_mime text;
