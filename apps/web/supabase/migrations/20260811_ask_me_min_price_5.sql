-- Me Pergunte: minimum price R$ 5,00 (aligned with paid products).

update public.profiles
set ask_me_price_cents = 500
where ask_me_price_cents is not null and ask_me_price_cents < 500;

alter table public.profiles
  drop constraint if exists profiles_ask_me_price_min;

alter table public.profiles
  add constraint profiles_ask_me_price_min
  check (ask_me_price_cents is null or ask_me_price_cents >= 500);

notify pgrst, 'reload schema';
