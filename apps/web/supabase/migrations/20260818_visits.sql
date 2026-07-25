-- Contagem exata de visitas em perfis de criadores e em produtos.
--
-- "Exata" = cada navegador conta no máximo uma vez por alvo. O navegador guarda
-- um `visitor_id` (uuid) no localStorage e o envia ao registrar a visita; a
-- unicidade (target, visitor_id) garante a deduplicação no banco — se o mesmo
-- navegador voltar, o INSERT cai no ON CONFLICT DO NOTHING e não conta de novo.
--
-- Defense-in-depth: as tabelas de ledger têm RLS habilitado e SEM policies, então
-- o browser (anon key) não lê nem escreve nelas diretamente. As escritas passam
-- por Route Handlers que usam a service role (`/api/creators/[id]/visit` e
-- `/api/products/[id]/visit`), que bypassa RLS. O contador denormalizado
-- (`visit_count`) é mantido por trigger e exposto para leitura pública, para que
-- o Explorar possa ordenar por visitas de forma barata.

-- ── Contadores denormalizados ───────────────────────────────────────────────

alter table public.profiles
  add column if not exists visit_count integer not null default 0;

alter table public.products
  add column if not exists visit_count integer not null default 0;

-- ── Ledger de visitas de perfil ─────────────────────────────────────────────

create table if not exists public.profile_visits (
  id          uuid        primary key default gen_random_uuid(),
  creator_id  uuid        not null references public.profiles (id) on delete cascade,
  visitor_id  text        not null,
  created_at  timestamptz not null default now(),
  unique (creator_id, visitor_id)
);

alter table public.profile_visits
  drop constraint if exists profile_visits_visitor_id_len;
alter table public.profile_visits
  add constraint profile_visits_visitor_id_len
  check (char_length(visitor_id) between 1 and 100);

create index if not exists profile_visits_creator_id_idx
  on public.profile_visits (creator_id);

alter table public.profile_visits enable row level security;
-- Sem policies: apenas a service role (bypassa RLS) escreve/lê.

-- ── Ledger de visitas de produto ────────────────────────────────────────────

create table if not exists public.product_visits (
  id          uuid        primary key default gen_random_uuid(),
  product_id  uuid        not null references public.products (id) on delete cascade,
  visitor_id  text        not null,
  created_at  timestamptz not null default now(),
  unique (product_id, visitor_id)
);

alter table public.product_visits
  drop constraint if exists product_visits_visitor_id_len;
alter table public.product_visits
  add constraint product_visits_visitor_id_len
  check (char_length(visitor_id) between 1 and 100);

create index if not exists product_visits_product_id_idx
  on public.product_visits (product_id);

alter table public.product_visits enable row level security;

-- ── Triggers: mantêm os contadores em sincronia com o ledger ────────────────

create or replace function public.increment_profile_visit_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
    set visit_count = visit_count + 1
    where id = new.creator_id;
  return new;
end;
$$;

drop trigger if exists profile_visits_increment on public.profile_visits;
create trigger profile_visits_increment
  after insert on public.profile_visits
  for each row
  execute function public.increment_profile_visit_count();

create or replace function public.increment_product_visit_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
    set visit_count = visit_count + 1
    where id = new.product_id;
  return new;
end;
$$;

drop trigger if exists product_visits_increment on public.product_visits;
create trigger product_visits_increment
  after insert on public.product_visits
  for each row
  execute function public.increment_product_visit_count();

-- ── Expor visit_count para leitura pública ──────────────────────────────────

-- Coluna nova precisa de grant explícito (o SELECT em profiles é por-coluna).
grant select (visit_count) on public.profiles to anon, authenticated;

-- Recria a view pública incluindo visit_count (mantém todas as colunas atuais).
create or replace view public.public_profiles
with (security_invoker = true)
as
  select
    id,
    creator_name,
    name,
    slug,
    socials,
    avatar_path,
    avatar_url,
    ask_me_enabled,
    ask_me_price_cents,
    bio,
    profile_default_tab,
    visit_count
  from public.profiles
  where slug is not null;

grant select on public.public_profiles to anon, authenticated;

notify pgrst, 'reload schema';
