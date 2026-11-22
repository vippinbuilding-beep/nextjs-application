-- Estoque atômico de produto físico (service role apenas).
--
-- decrement_product_stock: tira 1 unidade se houver estoque; retorna false se
-- esgotou (o pagamento é então reembolsado). increment_product_stock: devolve a
-- unidade quando o pedido é reembolsado antes da postagem.

create or replace function public.decrement_product_stock(p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.products
    set stock = stock - 1
    where id = p_product_id
      and type = 'physical'
      and stock > 0;
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

create or replace function public.increment_product_stock(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
    set stock = least(stock + 1, 100000)
    where id = p_product_id
      and type = 'physical';
end;
$$;

revoke all on function public.decrement_product_stock(uuid) from public, anon, authenticated;
revoke all on function public.increment_product_stock(uuid) from public, anon, authenticated;
grant execute on function public.decrement_product_stock(uuid) to service_role;
grant execute on function public.increment_product_stock(uuid) to service_role;

notify pgrst, 'reload schema';
