-- Paid products: minimum price R$ 5,00 (was R$ 2,00).
-- Free products (price_cents = 0) remain allowed.

update public.products
  set price_cents = 500
  where price_cents > 0 and price_cents < 500;

alter table public.products
  drop constraint if exists products_price_cents_positive;

alter table public.products
  add constraint products_price_cents_positive
  check (
    price_cents = 0
    or (price_cents >= 500 and price_cents <= 10000)
  );

-- Pending creator repasses: 10% + R$ 0,80 per sale (creator = round(gross×0.9) − 80).
-- Withdraw still deducts another R$ 0,80 in application code.

update public.orders
set
  creator_amount_cents = greatest(0, round(amount_cents * 0.9)::integer - 80),
  platform_fee_cents = amount_cents - greatest(0, round(amount_cents * 0.9)::integer - 80)
where
  status = 'paid'
  and transfer_status in ('pending', 'failed');

update public.ask_me_questions
set
  creator_amount_cents = greatest(0, round(amount_cents * 0.9)::integer - 80),
  platform_fee_cents = amount_cents - greatest(0, round(amount_cents * 0.9)::integer - 80)
where
  status = 'answered'
  and transfer_status in ('pending', 'failed');
