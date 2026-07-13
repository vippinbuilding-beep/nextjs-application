-- Custom Linktree-style links on creator public profiles.
-- Each row is a titled outbound URL with an optional cover image stored in
-- the private `profile-links` bucket (served via `/api/profile/links/[id]/image`).

create table if not exists public.profile_links (
  id          uuid        primary key default gen_random_uuid(),
  creator_id  uuid        not null references public.profiles (id) on delete cascade,
  title       text        not null,
  url         text        not null,
  image_path  text,
  image_mime  text,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profile_links_creator_id_idx
  on public.profile_links (creator_id);

create index if not exists profile_links_creator_sort_idx
  on public.profile_links (creator_id, sort_order, created_at);

alter table public.profile_links
  drop constraint if exists profile_links_title_len;
alter table public.profile_links
  add constraint profile_links_title_len
  check (char_length(title) between 2 and 60);

alter table public.profile_links
  drop constraint if exists profile_links_url_https;
alter table public.profile_links
  add constraint profile_links_url_https
  check (url ~ '^https://');

alter table public.profile_links
  drop constraint if exists profile_links_sort_order_non_negative;
alter table public.profile_links
  add constraint profile_links_sort_order_non_negative
  check (sort_order >= 0);

create or replace function public.set_profile_links_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profile_links_set_updated_at on public.profile_links;
create trigger profile_links_set_updated_at
  before update on public.profile_links
  for each row
  execute function public.set_profile_links_updated_at();

alter table public.profile_links enable row level security;

drop policy if exists "Profile links are publicly readable" on public.profile_links;
create policy "Profile links are publicly readable"
  on public.profile_links for select
  using (true);

drop policy if exists "Creators manage own profile links" on public.profile_links;
create policy "Creators insert own profile links"
  on public.profile_links for insert
  to authenticated
  with check (auth.uid() = creator_id);

drop policy if exists "Creators update own profile links" on public.profile_links;
create policy "Creators update own profile links"
  on public.profile_links for update
  to authenticated
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

drop policy if exists "Creators delete own profile links" on public.profile_links;
create policy "Creators delete own profile links"
  on public.profile_links for delete
  to authenticated
  using (auth.uid() = creator_id);
