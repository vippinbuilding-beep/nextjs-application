-- Produtos físicos (envio pela Melhor Envio).
--
-- Um produto `physical` não tem arquivo: tem peso/dimensões da embalagem,
-- estoque e quem paga o frete (`shipping_mode`):
--   * buyer_pays: o comprador paga o frete cotado no checkout (soma ao PIX);
--   * free:       frete grátis para o comprador — o custo sai do repasse do criador.
--
-- Os criadores escrevem em `products` direto do browser (RLS por dono), então
-- os CHECKs abaixo são a garantia real. Estoque só é decrementado no servidor
-- (RPC `decrement_product_stock`, service role).
--
-- Teto de preço: digital continua R$ 100,00; físico vai até R$ 1.000,00 e
-- precisa ser pago (mínimo R$ 5,00).

alter table public.products
  add column if not exists weight_grams  integer,
  add column if not exists length_cm     integer,
  add column if not exists width_cm      integer,
  add column if not exists height_cm     integer,
  add column if not exists stock         integer,
  add column if not exists shipping_mode text not null default 'buyer_pays';

alter table public.products
  drop constraint if exists products_type_valid;
alter table public.products
  add constraint products_type_valid
  check (type in ('single_lesson', 'document', 'physical'));

alter table public.products
  drop constraint if exists products_shipping_mode_valid;
alter table public.products
  add constraint products_shipping_mode_valid
  check (shipping_mode in ('buyer_pays', 'free'));

alter table public.products
  drop constraint if exists products_physical_package_valid;
alter table public.products
  add constraint products_physical_package_valid
  check (
    type <> 'physical'
    or (
      weight_grams between 1 and 30000
      and length_cm between 1 and 100
      and width_cm between 1 and 100
      and height_cm between 1 and 100
      and stock is not null
      and stock between 0 and 100000
    )
  );

alter table public.products
  drop constraint if exists products_price_cents_positive;
alter table public.products
  add constraint products_price_cents_positive
  check (
    case
      when type = 'physical' then price_cents between 500 and 100000
      else price_cents = 0 or (price_cents between 500 and 10000)
    end
  );

notify pgrst, 'reload schema';
