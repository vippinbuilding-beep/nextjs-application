-- Defense-in-depth: enforce profile field constraints at the database level.
-- Client-side validation can be bypassed (the browser talks to Supabase
-- directly), so these CHECK constraints guarantee no invalid data is written
-- even by a crafted request. RLS already restricts WHICH row a user can write;
-- these constraints restrict WHAT can be written into it.
--
-- `not valid` skips re-checking pre-existing rows (legacy data won't block the
-- migration) while still enforcing the rule on every future insert/update.

alter table public.profiles
  drop constraint if exists profiles_name_len;
alter table public.profiles
  add constraint profiles_name_len
  check (name is null or char_length(name) between 3 and 80) not valid;

alter table public.profiles
  drop constraint if exists profiles_creator_name_len;
alter table public.profiles
  add constraint profiles_creator_name_len
  check (creator_name is null or char_length(creator_name) between 2 and 40) not valid;

alter table public.profiles
  drop constraint if exists profiles_pix_key_len;
alter table public.profiles
  add constraint profiles_pix_key_len
  check (pix_key is null or char_length(pix_key) between 14 and 18) not valid;

alter table public.profiles
  drop constraint if exists profiles_birth_date_format;
alter table public.profiles
  add constraint profiles_birth_date_format
  check (birth_date is null or birth_date ~ '^\d{4}-\d{2}-\d{2}$') not valid;

alter table public.profiles
  drop constraint if exists profiles_socials_is_object;
alter table public.profiles
  add constraint profiles_socials_is_object
  check (socials is null or jsonb_typeof(socials) = 'object') not valid;
