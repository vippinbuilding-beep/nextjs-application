-- RPCs de analytics de VISITAS para o painel administrativo (@vippin/dashboard).
--
-- Mesmo contrato de segurança das demais admin_* (ver 20260814): SECURITY
-- INVOKER, execute revogado de `public` e concedido só a `service_role`, que é
-- quem o dashboard usa (bypassa RLS). Lê os contadores exatos mantidos por
-- 20260818_visits.sql (profiles.visit_count / products.visit_count).

-- ── Visão geral de visitas (KPIs) ────────────────────────────────────────────
create or replace function public.admin_visits_overview()
returns table (
  total_profile_visits bigint,
  visited_profiles bigint,
  total_product_visits bigint,
  visited_products bigint
)
language sql
as $$
  select
    coalesce((select sum(visit_count) from public.profiles), 0)::bigint,
    (select count(*) from public.profiles where visit_count > 0)::bigint,
    coalesce((select sum(visit_count) from public.products), 0)::bigint,
    (select count(*) from public.products where visit_count > 0)::bigint;
$$;

revoke execute on function public.admin_visits_overview() from public;
grant execute on function public.admin_visits_overview() to service_role;

-- ── Produtos mais visitados ──────────────────────────────────────────────────
create or replace function public.admin_top_visited_products(lim int)
returns table (
  product_id uuid,
  title text,
  creator_id uuid,
  creator_name text,
  visit_count bigint
)
language sql
as $$
  select
    p.id,
    p.title,
    p.creator_id,
    pr.creator_name,
    p.visit_count::bigint
  from public.products p
  left join public.profiles pr on pr.id = p.creator_id
  where p.visit_count > 0
  order by p.visit_count desc, p.created_at desc
  limit lim;
$$;

revoke execute on function public.admin_top_visited_products(int) from public;
grant execute on function public.admin_top_visited_products(int) to service_role;

-- ── Criadores (perfis) mais visitados ────────────────────────────────────────
create or replace function public.admin_top_visited_creators(lim int)
returns table (
  creator_id uuid,
  creator_name text,
  slug text,
  visit_count bigint
)
language sql
as $$
  select
    p.id,
    p.creator_name,
    p.slug,
    p.visit_count::bigint
  from public.profiles p
  where p.visit_count > 0
  order by p.visit_count desc, p.creator_name asc
  limit lim;
$$;

revoke execute on function public.admin_top_visited_creators(int) from public;
grant execute on function public.admin_top_visited_creators(int) to service_role;

-- ── Detalhe de usuário: adiciona visitas no perfil ───────────────────────────
-- Adicionar coluna ao retorno muda a assinatura OUT, então recriamos a função.
drop function if exists public.admin_user_detail(uuid);

create function public.admin_user_detail(uid uuid)
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
  profile_visit_count bigint,
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
    p.visit_count::bigint,
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
