-- Pedidos de produto físico: frete, destinatário e retenção (escrow) até a entrega.
--
-- Fórmula (ver @vippin/core/domain/shipping):
--   buyer_pays: base = preço;        PIX = preço + frete; shipping_charged = frete
--   free:       base = preço − frete; PIX = preço;        shipping_absorbed = frete
--   platform_fee = base − accrued(base); creator_amount = accrued(base)
--   amount = platform_fee + creator_amount + shipping_charged + shipping_absorbed
-- `shipping_cost_cents` é o custo real pago à Melhor Envio (preenchido na compra
-- da etiqueta); a diferença para o cotado é absorvida pela plataforma.
--
-- Escrow: pedido físico pago fica com transfer_status = 'held' (fora do saque)
-- até `fulfillment_status = 'released'`, quando volta a 'pending' e entra no
-- saque normal. Digital continua `fulfillment_status = 'none'` (inalterado).
--
-- Destinatário (ship_to_*) é PII: orders não tem leitura anônima; só comprador
-- e criador do pedido leem (RLS de 20260715), e o criador precisa dele para a etiqueta.

alter table public.orders
  add column if not exists shipping_mode           text,
  add column if not exists shipping_quote          jsonb,
  add column if not exists shipping_charged_cents  integer not null default 0,
  add column if not exists shipping_absorbed_cents integer not null default 0,
  add column if not exists shipping_cost_cents     integer,
  add column if not exists ship_to_name            text,
  add column if not exists ship_to_document        text,
  add column if not exists ship_to_phone           text,
  add column if not exists ship_to_email           text,
  add column if not exists ship_to_postal_code     text,
  add column if not exists ship_to_street          text,
  add column if not exists ship_to_number          text,
  add column if not exists ship_to_complement      text,
  add column if not exists ship_to_district        text,
  add column if not exists ship_to_city            text,
  add column if not exists ship_to_state           text,
  add column if not exists fulfillment_status      text not null default 'none',
  add column if not exists prepare_deadline_at     timestamptz,
  add column if not exists post_deadline_at        timestamptz,
  add column if not exists released_at             timestamptz,
  add column if not exists refunded_at             timestamptz,
  -- Admin "reter": while set, the escrow jobs never auto-release this order.
  add column if not exists admin_hold_at           timestamptz;

alter table public.orders
  drop constraint if exists orders_shipping_mode_valid;
alter table public.orders
  add constraint orders_shipping_mode_valid
  check (shipping_mode is null or shipping_mode in ('buyer_pays', 'free'));

alter table public.orders
  drop constraint if exists orders_shipping_amounts_valid;
alter table public.orders
  add constraint orders_shipping_amounts_valid
  check (
    shipping_charged_cents >= 0
    and shipping_absorbed_cents >= 0
    and (shipping_charged_cents = 0 or shipping_absorbed_cents = 0)
    and (shipping_cost_cents is null or shipping_cost_cents >= 0)
  );

-- Nenhum centavo criado ou perdido, agora incluindo o frete.
alter table public.orders
  drop constraint if exists orders_split_sums;
alter table public.orders
  add constraint orders_split_sums
  check (
    amount_cents = platform_fee_cents + creator_amount_cents
      + shipping_charged_cents + shipping_absorbed_cents
  );

alter table public.orders
  drop constraint if exists orders_fulfillment_status_valid;
alter table public.orders
  add constraint orders_fulfillment_status_valid
  check (fulfillment_status in (
    'none',
    'awaiting_shipment',
    'label_ready',
    'posted',
    'in_transit',
    'delivered',
    'released',
    'refund_pending',
    'refunded'
  ));

alter table public.orders
  drop constraint if exists orders_transfer_status_valid;
alter table public.orders
  add constraint orders_transfer_status_valid
  check (transfer_status in ('pending', 'sent', 'failed', 'held', 'refunded'));

alter table public.orders
  drop constraint if exists orders_ship_to_valid;
alter table public.orders
  add constraint orders_ship_to_valid
  check (
    (ship_to_document is null or ship_to_document ~ '^(\d{11}|\d{14})$')
    and (ship_to_phone is null or ship_to_phone ~ '^\d{10,11}$')
    and (ship_to_postal_code is null or ship_to_postal_code ~ '^\d{8}$')
    and (ship_to_state is null or ship_to_state ~ '^[A-Z]{2}$')
  );

-- Fila do cron/admin: só pedidos físicos ainda em andamento.
create index if not exists orders_fulfillment_active_idx
  on public.orders (fulfillment_status, updated_at)
  where fulfillment_status not in ('none', 'released', 'refunded');

notify pgrst, 'reload schema';
