-- Raise the per-bucket upload cap for product videos/documents.
-- Note: this cannot exceed the project's global file size limit configured in
-- Supabase Dashboard > Project Settings > Storage.

update storage.buckets
set file_size_limit = 524288000  -- 500 MB
where id = 'products';

-- If the bucket was never created (migration 20260706 not applied yet), create
-- it now with the correct limit.
insert into storage.buckets (id, name, public, file_size_limit)
values ('products', 'products', true, 524288000)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;
