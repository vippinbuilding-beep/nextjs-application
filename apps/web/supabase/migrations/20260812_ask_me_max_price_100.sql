-- Me Pergunte: maximum price R$ 100,00.

update public.profiles
set ask_me_price_cents = 10000
where ask_me_price_cents is not null and ask_me_price_cents > 10000;

alter table public.profiles
  drop constraint if exists profiles_ask_me_price_max;

alter table public.profiles
  add constraint profiles_ask_me_price_max
  check (ask_me_price_cents is null or ask_me_price_cents <= 10000);

notify pgrst, 'reload schema';
