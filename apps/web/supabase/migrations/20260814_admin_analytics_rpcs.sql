-- RPCs de analytics do painel administrativo (@vippin/dashboard).
--
-- Segurança: estas funções são chamadas EXCLUSIVAMENTE pelo service role do
-- dashboard (que bypassa RLS). Por isso são SECURITY INVOKER (o padrão) — não
-- reintroduzimos SECURITY DEFINER, que o projeto removeu antes por lints
-- (ver 20260729_remove_public_security_definer_rpcs.sql). O acesso é fechado
-- revogando execute de `public` (cobre anon/authenticated) e concedendo apenas
-- a `service_role`.
--
-- Datas agregadas por dia usam o fuso 'America/Sao_Paulo' para que "vendas de
-- hoje" batam com a percepção do time no Brasil.

-- ── Visão Geral: KPIs ────────────────────────────────────────────────────────
-- Contagens de usuários/produtos são all-time; GMV/receita/conversão respeitam
-- a janela [from_ts, to_ts). Ask Me answered/awaiting são estado atual.
create or replace function public.admin_overview_stats(
  from_ts timestamptz,
  to_ts timestamptz
)
returns table (
  total_users bigint,
  total_creators bigint,
  total_consumers bigint,
  total_products bigint,
  gmv_cents bigint,
  platform_revenue_cents bigint,
  orders_total bigint,
  orders_paid bigint,
  ask_me_answered bigint,
  ask_me_awaiting_response bigint
)
language sql
as $$
  select
    (select count(*) from public.profiles)::bigint,
    (select count(*) from public.profiles where role = 'creator')::bigint,
    (select count(*) from public.profiles where role = 'consumer')::bigint,
    (select count(*) from public.products)::bigint,
    (
      coalesce((select sum(amount_cents) from public.orders
        where status = 'paid' and paid_at >= from_ts and paid_at < to_ts), 0)
      + coalesce((select sum(amount_cents) from public.ask_me_questions
        where paid_at is not null and paid_at >= from_ts and paid_at < to_ts), 0)
    )::bigint,
    (
      coalesce((select sum(platform_fee_cents) from public.orders
        where status = 'paid' and paid_at >= from_ts and paid_at < to_ts), 0)
      + coalesce((select sum(platform_fee_cents) from public.ask_me_questions
        where status = 'answered' and paid_at >= from_ts and paid_at < to_ts), 0)
    )::bigint,
    (select count(*) from public.orders
      where created_at >= from_ts and created_at < to_ts)::bigint,
    (select count(*) from public.orders
      where status = 'paid' and paid_at >= from_ts and paid_at < to_ts)::bigint,
    (select count(*) from public.ask_me_questions where status = 'answered')::bigint,
    (select count(*) from public.ask_me_questions where status = 'awaiting_response')::bigint;
$$;

revoke execute on function public.admin_overview_stats(timestamptz, timestamptz) from public;
grant execute on function public.admin_overview_stats(timestamptz, timestamptz) to service_role;

-- ── Receita/GMV por dia (orders + ask_me pagos) ──────────────────────────────
create or replace function public.admin_revenue_by_day(
  from_ts timestamptz,
  to_ts timestamptz
)
returns table (
  day date,
  gmv_cents bigint,
  platform_fee_cents bigint,
  orders_count bigint
)
language sql
as $$
  with paid as (
    select paid_at, amount_cents, platform_fee_cents, 1 as is_order
    from public.orders
    where status = 'paid' and paid_at >= from_ts and paid_at < to_ts
    union all
    select paid_at, amount_cents,
           case when status = 'answered' then platform_fee_cents else 0 end,
           0
    from public.ask_me_questions
    where paid_at is not null and paid_at >= from_ts and paid_at < to_ts
  )
  select
    (paid_at at time zone 'America/Sao_Paulo')::date as day,
    coalesce(sum(amount_cents), 0)::bigint,
    coalesce(sum(platform_fee_cents), 0)::bigint,
    coalesce(sum(is_order), 0)::bigint
  from paid
  group by 1
  order by 1;
$$;

revoke execute on function public.admin_revenue_by_day(timestamptz, timestamptz) from public;
grant execute on function public.admin_revenue_by_day(timestamptz, timestamptz) to service_role;

-- ── Crescimento de usuários por dia ──────────────────────────────────────────
create or replace function public.admin_user_growth_by_day(
  from_ts timestamptz,
  to_ts timestamptz
)
returns table (
  day date,
  creators bigint,
  consumers bigint
)
language sql
as $$
  select
    (created_at at time zone 'America/Sao_Paulo')::date as day,
    count(*) filter (where role = 'creator')::bigint,
    count(*) filter (where role = 'consumer')::bigint
  from public.profiles
  where created_at >= from_ts and created_at < to_ts
  group by 1
  order by 1;
$$;

revoke execute on function public.admin_user_growth_by_day(timestamptz, timestamptz) from public;
grant execute on function public.admin_user_growth_by_day(timestamptz, timestamptz) to service_role;

-- ── Produtos mais vendidos ───────────────────────────────────────────────────
create or replace function public.admin_top_products(lim int)
returns table (
  product_id uuid,
  title text,
  creator_id uuid,
  creator_name text,
  sales_count bigint,
  gross_cents bigint
)
language sql
as $$
  select
    p.id,
    p.title,
    p.creator_id,
    pr.creator_name,
    count(o.id)::bigint,
    coalesce(sum(o.amount_cents), 0)::bigint
  from public.products p
  join public.orders o on o.product_id = p.id and o.status = 'paid'
  left join public.profiles pr on pr.id = p.creator_id
  group by p.id, p.title, p.creator_id, pr.creator_name
  order by count(o.id) desc, sum(o.amount_cents) desc
  limit lim;
$$;

revoke execute on function public.admin_top_products(int) from public;
grant execute on function public.admin_top_products(int) to service_role;

-- ── Produtos sem nenhuma venda paga ──────────────────────────────────────────
create or replace function public.admin_products_without_sales(lim int)
returns table (
  product_id uuid,
  title text,
  creator_id uuid,
  creator_name text,
  created_at timestamptz
)
language sql
as $$
  select
    p.id,
    p.title,
    p.creator_id,
    pr.creator_name,
    p.created_at
  from public.products p
  left join public.profiles pr on pr.id = p.creator_id
  where not exists (
    select 1 from public.orders o
    where o.product_id = p.id and o.status = 'paid'
  )
  order by p.created_at desc
  limit lim;
$$;

revoke execute on function public.admin_products_without_sales(int) from public;
grant execute on function public.admin_products_without_sales(int) to service_role;

-- ── Contagem de produtos por tipo ────────────────────────────────────────────
create or replace function public.admin_products_by_type()
returns table (type text, count bigint)
language sql
as $$
  select type, count(*)::bigint
  from public.products
  group by type
  order by type;
$$;

revoke execute on function public.admin_products_by_type() from public;
grant execute on function public.admin_products_by_type() to service_role;

-- ── Pedidos por status (para o módulo Financeiro) ────────────────────────────
create or replace function public.admin_orders_by_status()
returns table (status text, count bigint, amount_cents bigint)
language sql
as $$
  select status, count(*)::bigint, coalesce(sum(amount_cents), 0)::bigint
  from public.orders
  group by status
  order by status;
$$;

revoke execute on function public.admin_orders_by_status() from public;
grant execute on function public.admin_orders_by_status() to service_role;

-- ── Visão de Ask Me (contagens por status + tempo médio de resposta) ─────────
-- avg_response_seconds mede paid_at → answered_at das perguntas respondidas.
create or replace function public.admin_ask_me_overview()
returns table (
  total bigint,
  answered bigint,
  declined bigint,
  expired bigint,
  awaiting_response bigint,
  pending_payment bigint,
  avg_response_seconds numeric
)
language sql
as $$
  select
    count(*)::bigint,
    count(*) filter (where status = 'answered')::bigint,
    count(*) filter (where status = 'declined')::bigint,
    count(*) filter (where status = 'expired')::bigint,
    count(*) filter (where status = 'awaiting_response')::bigint,
    count(*) filter (where status = 'pending_payment')::bigint,
    avg(extract(epoch from (answered_at - paid_at)))
      filter (where status = 'answered' and answered_at is not null and paid_at is not null)
  from public.ask_me_questions;
$$;

revoke execute on function public.admin_ask_me_overview() from public;
grant execute on function public.admin_ask_me_overview() to service_role;

-- ── Detalhe de um usuário (perfil + agregados como criador e consumidor) ─────
create or replace function public.admin_user_detail(uid uuid)
returns table (
  id uuid,
  email text,
  display_name text,
  creator_name text,
  slug text,
  role text,
  onboarding_completed boolean,
  created_at timestamptz,
  name text,
  bio text,
  ask_me_enabled boolean,
  ask_me_price_cents integer,
  products_count bigint,
  sales_count bigint,
  gross_sales_cents bigint,
  ask_me_received_count bigint,
  purchases_count bigint,
  purchases_spent_cents bigint,
  ask_me_asked_count bigint
)
language sql
as $$
  select
    p.id,
    p.email,
    p.display_name,
    p.creator_name,
    p.slug,
    p.role,
    p.onboarding_completed,
    p.created_at,
    p.name,
    p.bio,
    p.ask_me_enabled,
    p.ask_me_price_cents,
    (select count(*) from public.products pr where pr.creator_id = p.id)::bigint,
    (select count(*) from public.orders o
      where o.creator_id = p.id and o.status = 'paid')::bigint,
    coalesce((select sum(amount_cents) from public.orders o
      where o.creator_id = p.id and o.status = 'paid'), 0)::bigint,
    (select count(*) from public.ask_me_questions a where a.creator_id = p.id)::bigint,
    (select count(*) from public.orders o
      where o.buyer_id = p.id and o.status = 'paid')::bigint,
    coalesce((select sum(amount_cents) from public.orders o
      where o.buyer_id = p.id and o.status = 'paid'), 0)::bigint,
    (select count(*) from public.ask_me_questions a where a.asker_id = p.id)::bigint
  from public.profiles p
  where p.id = uid;
$$;

revoke execute on function public.admin_user_detail(uuid) from public;
grant execute on function public.admin_user_detail(uuid) to service_role;

notify pgrst, 'reload schema';
