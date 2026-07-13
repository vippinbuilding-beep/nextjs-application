-- Store the selected PIX key type for creator profiles.

alter table public.profiles
  add column if not exists pix_key_type text;

alter table public.profiles
  drop constraint if exists profiles_pix_key_type_check;

alter table public.profiles
  add constraint profiles_pix_key_type_check
  check (
    pix_key_type is null
    or pix_key_type in ('cpf', 'cnpj', 'email', 'phone', 'random')
  );
