-- Fixes "infinite recursion detected in policy for relation products".
--
-- The products SELECT policy (20260815_product_status.sql) checked
-- product_accesses directly; the product_accesses SELECT policy
-- (20260713_product_accesses.sql) checks products.creator_id back. Evaluating
-- one policy re-triggers the other in a loop.
--
-- Fix: reuse private.user_has_product_access(uuid) (added in
-- 20260727_fix_function_security_lints.sql for the same reason, on
-- product_comments) — it's SECURITY DEFINER, so its internal reads of
-- products/product_accesses bypass RLS entirely instead of re-entering these
-- policies.

grant execute on function private.user_has_product_access(uuid) to anon;

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select
  using (
    status = 'active'
    or private.user_has_product_access(id)
  );

notify pgrst, 'reload schema';
