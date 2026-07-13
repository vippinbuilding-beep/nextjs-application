-- Storage bucket for product files (lesson videos and documents).

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Product files are publicly readable" on storage.objects;
create policy "Product files are publicly readable"
  on storage.objects for select
  using (bucket_id = 'products');

drop policy if exists "Creators can upload own product files" on storage.objects;
create policy "Creators can upload own product files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'products'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators can update own product files" on storage.objects;
create policy "Creators can update own product files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'products'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'products'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators can delete own product files" on storage.objects;
create policy "Creators can delete own product files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'products'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
