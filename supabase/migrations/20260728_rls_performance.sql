-- Splinter performance fixes:
-- 0003 auth_rls_initplan — wrap auth.uid() in (select …) so it is not re-evaluated per row
-- 0006 multiple_permissive_policies — merge overlapping SELECT policies into one

-- ── profiles ────────────────────────────────────────────────────────────────

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Anyone can view public creator profiles" on public.profiles;
create policy "Users can view own or public creator profiles"
  on public.profiles for select
  using (
    (select auth.uid()) = id
    or slug is not null
  );

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

-- ── products ────────────────────────────────────────────────────────────────

drop policy if exists "Creators can insert own products" on public.products;
create policy "Creators can insert own products"
  on public.products for insert
  with check (
    (select auth.uid()) = creator_id
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'creator'
    )
  );

drop policy if exists "Creators can update own products" on public.products;
create policy "Creators can update own products"
  on public.products for update
  using (
    (select auth.uid()) = creator_id
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'creator'
    )
  )
  with check (
    (select auth.uid()) = creator_id
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'creator'
    )
  );

drop policy if exists "Creators can delete own products" on public.products;
create policy "Creators can delete own products"
  on public.products for delete
  using (
    (select auth.uid()) = creator_id
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'creator'
    )
  );

-- ── profile_links ───────────────────────────────────────────────────────────

drop policy if exists "Creators insert own profile links" on public.profile_links;
create policy "Creators insert own profile links"
  on public.profile_links for insert
  with check ((select auth.uid()) = creator_id);

drop policy if exists "Creators update own profile links" on public.profile_links;
create policy "Creators update own profile links"
  on public.profile_links for update
  using ((select auth.uid()) = creator_id)
  with check ((select auth.uid()) = creator_id);

drop policy if exists "Creators delete own profile links" on public.profile_links;
create policy "Creators delete own profile links"
  on public.profile_links for delete
  using ((select auth.uid()) = creator_id);

-- ── notifications ───────────────────────────────────────────────────────────

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── ask_me_questions ────────────────────────────────────────────────────────

drop policy if exists "Askers read own ask me questions" on public.ask_me_questions;
drop policy if exists "Creators read received ask me questions" on public.ask_me_questions;
create policy "Users read relevant ask me questions"
  on public.ask_me_questions for select
  to authenticated
  using (
    (select auth.uid()) = asker_id
    or (select auth.uid()) = creator_id
  );

-- ── orders ──────────────────────────────────────────────────────────────────

drop policy if exists "Buyers read own orders" on public.orders;
drop policy if exists "Creators read orders for own products" on public.orders;
create policy "Buyers and creators read relevant orders"
  on public.orders for select
  to authenticated
  using (
    (select auth.uid()) = buyer_id
    or (select auth.uid()) = creator_id
  );
