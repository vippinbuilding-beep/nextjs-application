-- `save_product_progress` só faz sentido para usuários autenticados: a função
-- grava em `user_id = auth.uid()` e já retorna cedo quando não há sessão, então
-- o grant para `anon` nunca fazia nada útil (apenas um no-op silencioso).
--
-- Revogamos o execute de `anon` e mantemos apenas `authenticated`, para que uma
-- eventual chamada anônima falhe de forma explícita em vez de passar batido.

revoke execute on function public.save_product_progress(uuid, numeric, numeric, boolean)
  from anon;

grant execute on function public.save_product_progress(uuid, numeric, numeric, boolean)
  to authenticated;

notify pgrst, 'reload schema';
