-- Tightens product field limits (defense-in-depth: the client validates in
-- product-form.tsx for UX, but the real guarantee lives here since the
-- browser talks to Supabase directly with the anon key):
--   * title: max 80 characters (min stays 2)
--   * description: max 255 characters
--   * price: max R$ 100,00 (10000 cents)
--
-- Existing rows that exceed the new limits are truncated/capped first so the
-- new CHECK constraints below don't fail on old data.

update public.products
  set title = left(title, 80)
  where char_length(title) > 80;

update public.products
  set description = left(description, 255)
  where description is not null and char_length(description) > 255;

update public.products
  set price_cents = 10000
  where price_cents > 10000;

alter table public.products
  drop constraint if exists products_title_len;
alter table public.products
  add constraint products_title_len
  check (char_length(title) between 2 and 80);

alter table public.products
  drop constraint if exists products_description_len;
alter table public.products
  add constraint products_description_len
  check (description is null or char_length(description) <= 255);

alter table public.products
  drop constraint if exists products_price_cents_positive;
alter table public.products
  add constraint products_price_cents_positive
  check (price_cents >= 0 and price_cents <= 10000);
