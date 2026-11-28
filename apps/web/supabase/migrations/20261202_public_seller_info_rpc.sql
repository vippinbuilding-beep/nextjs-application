-- Identificação do vendedor na página de produto físico (Decreto 7.962/2013):
-- nome, documento MASCARADO, cidade/UF e perfil fiscal. Os dados ficam em
-- colunas PII de profiles (sem grant público), então a leitura pública passa
-- por esta função SECURITY DEFINER que devolve só o necessário, e só para
-- produto físico ativo. Nunca endereço nem documento completo.

create or replace function public.get_public_seller_info(p_product_id uuid)
returns table (
  seller_name     text,
  masked_document text,
  city            text,
  state           text,
  seller_profile  text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.ship_from_name,
    case
      when pr.ship_from_document ~ '^\d{11}$' then
        '***.' || substr(pr.ship_from_document, 4, 3) || '.'
        || substr(pr.ship_from_document, 7, 3) || '-**'
      when pr.ship_from_document ~ '^\d{14}$' then
        substr(pr.ship_from_document, 1, 2) || '.' || substr(pr.ship_from_document, 3, 3)
        || '.***/****-' || substr(pr.ship_from_document, 13, 2)
      else null
    end,
    pr.ship_from_city,
    pr.ship_from_state,
    pr.seller_profile
  from public.products p
  join public.profiles pr on pr.id = p.creator_id
  where p.id = p_product_id
    and p.type = 'physical'
    and p.status = 'active'
    and pr.ship_from_name is not null;
$$;

revoke all on function public.get_public_seller_info(uuid) from public;
grant execute on function public.get_public_seller_info(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
