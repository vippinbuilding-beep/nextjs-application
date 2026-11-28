-- Perfil fiscal do vendedor de produtos físicos: pessoa física (CPF), MEI ou
-- empresa (CNPJ). Define qual documento a etiqueta aceita (DC-e / NF-e) e se
-- vale o limite mensal de PF (regras em @vippin/core/domain/seller-profile).
--
-- PII, mesmo regime de ship_from_*: sem grant para anon/authenticated; escrita
-- só pelo Route Handler `/api/profile/ship-from` (service role).

alter table public.profiles
  add column if not exists seller_profile text;

alter table public.profiles
  drop constraint if exists profiles_seller_profile_valid;
alter table public.profiles
  add constraint profiles_seller_profile_valid
  check (
    seller_profile is null
    or (seller_profile = 'pf' and ship_from_document ~ '^\d{11}$')
    or (seller_profile in ('mei', 'company') and ship_from_document ~ '^\d{14}$')
  ) not valid;

-- Histórico de mudança de perfil/documento (defesa em disputas e futuras
-- obrigações de informação da plataforma). Só o trigger escreve.
create table if not exists public.seller_profile_changes (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  from_profile  text,
  to_profile    text,
  from_document text,
  to_document   text,
  changed_at    timestamptz not null default now(),
  constraint seller_profile_changes_profile_valid check (
    (from_profile is null or from_profile in ('pf', 'mei', 'company'))
    and (to_profile is null or to_profile in ('pf', 'mei', 'company'))
  )
);

create index if not exists seller_profile_changes_user_idx
  on public.seller_profile_changes (user_id, changed_at desc);

alter table public.seller_profile_changes enable row level security;

drop policy if exists "Sellers read own profile changes" on public.seller_profile_changes;
create policy "Sellers read own profile changes"
  on public.seller_profile_changes for select
  using (auth.uid() = user_id);

create or replace function public.log_seller_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.seller_profile is distinct from old.seller_profile
     or new.ship_from_document is distinct from old.ship_from_document then
    insert into public.seller_profile_changes
      (user_id, from_profile, to_profile, from_document, to_document)
    values
      (new.id, old.seller_profile, new.seller_profile,
       old.ship_from_document, new.ship_from_document);
  end if;
  return new;
end;
$$;

revoke all on function public.log_seller_profile_change() from public, anon, authenticated;

drop trigger if exists profiles_log_seller_profile_change on public.profiles;
create trigger profiles_log_seller_profile_change
  after update of seller_profile, ship_from_document on public.profiles
  for each row execute function public.log_seller_profile_change();

notify pgrst, 'reload schema';
