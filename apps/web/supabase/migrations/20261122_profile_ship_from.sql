-- Endereço/documento do remetente (criador) usado nas etiquetas da Melhor Envio.
--
-- PII: as colunas novas NÃO recebem grant para anon/authenticated (desde
-- 20260726 só colunas públicas listadas têm SELECT). Leitura do próprio perfil
-- continua via get_own_profile() / service role; escrita só pelo Route Handler
-- `/api/profile/ship-from` com service role (20260730 revogou writes do browser).

alter table public.profiles
  add column if not exists ship_from_name           text,
  add column if not exists ship_from_document       text,
  add column if not exists ship_from_state_register text,
  add column if not exists ship_from_phone          text,
  add column if not exists ship_from_postal_code    text,
  add column if not exists ship_from_street         text,
  add column if not exists ship_from_number         text,
  add column if not exists ship_from_complement     text,
  add column if not exists ship_from_district       text,
  add column if not exists ship_from_city           text,
  add column if not exists ship_from_state          text;

alter table public.profiles
  drop constraint if exists profiles_ship_from_valid;
alter table public.profiles
  add constraint profiles_ship_from_valid
  check (
    (ship_from_name is null or char_length(ship_from_name) between 3 and 80)
    and (ship_from_document is null or ship_from_document ~ '^(\d{11}|\d{14})$')
    and (ship_from_state_register is null or char_length(ship_from_state_register) <= 20)
    and (ship_from_phone is null or ship_from_phone ~ '^\d{10,11}$')
    and (ship_from_postal_code is null or ship_from_postal_code ~ '^\d{8}$')
    and (ship_from_street is null or char_length(ship_from_street) between 2 and 120)
    and (ship_from_number is null or char_length(ship_from_number) between 1 and 10)
    and (ship_from_complement is null or char_length(ship_from_complement) <= 60)
    and (ship_from_district is null or char_length(ship_from_district) between 2 and 60)
    and (ship_from_city is null or char_length(ship_from_city) between 2 and 60)
    and (ship_from_state is null or ship_from_state ~ '^[A-Z]{2}$')
  ) not valid;

notify pgrst, 'reload schema';
