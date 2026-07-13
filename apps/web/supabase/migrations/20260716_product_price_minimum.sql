-- Minimum price for paid products: R$ 2,00 (200 cents).
-- Free products (price_cents = 0) remain allowed.
--
-- Defense-in-depth: the client validates in product-form.tsx; the checkout
-- route also rejects sub-minimum prices. This CHECK is the real guarantee.

update public.products
  set price_cents = 200
  where price_cents > 0 and price_cents < 200;

alter table public.products
  drop constraint if exists products_price_cents_positive;

alter table public.products
  add constraint products_price_cents_positive
  check (
    price_cents = 0
    or (price_cents >= 200 and price_cents <= 10000)
  );
