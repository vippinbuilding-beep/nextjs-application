-- Track whether the current avatar was imported from Google OAuth (stored in
-- Storage via avatar_path — never a live googleusercontent.com URL).

alter table public.profiles
  add column if not exists avatar_from_google boolean not null default false;
