-- Private bucket for creator profile photos. Bytes are served through
-- `/api/profiles/[id]/avatar` (public, cacheable) via short-lived signed URLs.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Creators can upload own avatar" on storage.objects;
create policy "Creators can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators can update own avatar" on storage.objects;
create policy "Creators can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators can delete own avatar" on storage.objects;
create policy "Creators can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
