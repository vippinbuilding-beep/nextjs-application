-- Me Pergunte: minimum price R$ 2,00 (was R$ 3,00).
-- Profiles: minimum signup age 15 years (birth_date on or before today - 15 years).

alter table public.profiles
  drop constraint if exists profiles_ask_me_price_min;

alter table public.profiles
  add constraint profiles_ask_me_price_min
  check (ask_me_price_cents is null or ask_me_price_cents >= 200);

alter table public.profiles
  drop constraint if exists profiles_birth_date_min_age;

alter table public.profiles
  add constraint profiles_birth_date_min_age
  check (
    birth_date is null
    or birth_date <= to_char((current_date - interval '15 years')::date, 'YYYY-MM-DD')
  ) not valid;

notify pgrst, 'reload schema';
