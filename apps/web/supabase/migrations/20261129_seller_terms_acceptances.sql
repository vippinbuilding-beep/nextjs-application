-- Aceite dos Termos do vendedor (versão + data/hora). Sem aceite da versão
-- atual não é possível publicar um produto físico (trigger em products), nem
-- pela API do Supabase com a anon key.
--
-- Ao mudar o texto (SELLER_TERMS_VERSION em @vippin/core/domain/seller-terms),
-- crie uma migration que recria current_seller_terms_version() com a nova versão.

create table if not exists public.seller_terms_acceptances (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  terms_version text        not null,
  accepted_at   timestamptz not null default now(),
  constraint seller_terms_acceptances_version_valid
    check (terms_version ~ '^\d{4}-\d{2}-v\d+$'),
  constraint seller_terms_acceptances_unique unique (user_id, terms_version)
);

alter table public.seller_terms_acceptances enable row level security;

drop policy if exists "Sellers read own terms acceptances" on public.seller_terms_acceptances;
create policy "Sellers read own terms acceptances"
  on public.seller_terms_acceptances for select
  using (auth.uid() = user_id);

-- Só insere para si mesmo e com a data do servidor (accepted_at padrão);
-- sem policy de update/delete: o registro é imutável.
drop policy if exists "Sellers accept terms for themselves" on public.seller_terms_acceptances;
create policy "Sellers accept terms for themselves"
  on public.seller_terms_acceptances for insert
  with check (
    auth.uid() = user_id
    and accepted_at between now() - interval '1 minute' and now() + interval '1 minute'
  );

-- Os privilégios padrão do Supabase dão ALL para anon/authenticated; aqui o
-- aceite é imutável e só o próprio usuário logado lê e insere.
revoke all on public.seller_terms_acceptances from anon, authenticated;
grant select, insert on public.seller_terms_acceptances to authenticated;
grant all on public.seller_terms_acceptances to service_role;

create or replace function public.current_seller_terms_version()
returns text
language sql
immutable
as $$ select '2026-11-v1'::text $$;

create or replace function public.require_seller_terms_for_physical()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'physical'
     and new.status = 'active'
     and (tg_op = 'INSERT' or old.type <> 'physical' or old.status <> 'active')
     and not exists (
       select 1 from public.seller_terms_acceptances sta
       where sta.user_id = new.creator_id
         and sta.terms_version = public.current_seller_terms_version()
     ) then
    raise exception 'Aceite os Termos do vendedor antes de publicar um produto físico.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.require_seller_terms_for_physical() from public, anon, authenticated;

drop trigger if exists products_require_seller_terms on public.products;
create trigger products_require_seller_terms
  before insert or update of type, status on public.products
  for each row execute function public.require_seller_terms_for_physical();

notify pgrst, 'reload schema';
