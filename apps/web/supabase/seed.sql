-- Seed dos branches do Supabase (preview/persistentes) e do ambiente local.
-- O projeto de PRODUÇÃO nunca roda este arquivo.
--
-- Por quê: projetos/branches novos do Supabase não recebem mais os privilégios
-- padrão da Data API (GRANT ALL nas tabelas do `public` para anon,
-- authenticated e service_role). Produção foi criada antes disso e as
-- migrations contam com esses privilégios; sem eles, até a service role leva
-- "permission denied" (42501). Este arquivo reproduz o estado de produção.
--
-- Ficam de fora do GRANT em bloco (as migrations já dão os grants certos):
--   * profiles: SELECT só por coluna e escrita revogada (PII de ship_from_*).
--   * seller_terms_acceptances: só select/insert para authenticated.
--   * views (public_profiles, public_profile_previews): SELECT explícito.
-- Funções não recebem GRANT em bloco: as migrations revogam EXECUTE de RPCs
-- sensíveis (estoque, analytics) de propósito.

grant usage on schema public to anon, authenticated, service_role;

do $$
declare
  t record;
begin
  for t in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm')
  loop
    execute format('grant all on public.%I to service_role', t.relname);

    if t.relkind in ('r', 'p')
       and t.relname not in ('profiles', 'seller_terms_acceptances') then
      execute format('grant all on public.%I to anon, authenticated', t.relname);
    end if;
  end loop;
end
$$;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to service_role;

-- Objetos criados por migrations futuras recebem os mesmos padrões de
-- produção (as migrations revogam o que precisa ficar fechado).
alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;
