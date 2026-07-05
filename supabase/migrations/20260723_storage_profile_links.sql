-- Private bucket for profile link cover images. Bytes are served through
-- `/api/profile/links/[id]/image` via short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit)
values ('profile-links', 'profile-links', false, 5242880)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "Creators upload own profile link images" on storage.objects;
create policy "Creators upload own profile link images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-links'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators update own profile link images" on storage.objects;
create policy "Creators update own profile link images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-links'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-links'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators delete own profile link images" on storage.objects;
create policy "Creators delete own profile link images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-links'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
