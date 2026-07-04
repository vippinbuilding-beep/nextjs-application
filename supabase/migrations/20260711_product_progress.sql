-- Per-user viewing progress for video products.
-- The browser writes with the anon key, so RLS keeps each viewer scoped to
-- their own rows.

create table if not exists public.product_progresses (
  user_id          uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  product_id       uuid        not null references public.products (id) on delete cascade,
  position_seconds numeric(12,3) not null default 0,
  duration_seconds numeric(12,3),
  completed        boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists product_progresses_product_id_idx
  on public.product_progresses (product_id);

alter table public.product_progresses
  drop constraint if exists product_progresses_position_positive;
alter table public.product_progresses
  add constraint product_progresses_position_positive
  check (position_seconds >= 0);

alter table public.product_progresses
  drop constraint if exists product_progresses_duration_positive;
alter table public.product_progresses
  add constraint product_progresses_duration_positive
  check (duration_seconds is null or duration_seconds >= 0);

create or replace function public.set_product_progresses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists product_progresses_set_updated_at on public.product_progresses;
create trigger product_progresses_set_updated_at
  before update on public.product_progresses
  for each row
  execute function public.set_product_progresses_updated_at();

alter table public.product_progresses enable row level security;

drop policy if exists "Users can read own product progress" on public.product_progresses;
create policy "Users can read own product progress"
  on public.product_progresses for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own product progress" on public.product_progresses;
create policy "Users can insert own product progress"
  on public.product_progresses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own product progress" on public.product_progresses;
create policy "Users can update own product progress"
  on public.product_progresses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own product progress" on public.product_progresses;
create policy "Users can delete own product progress"
  on public.product_progresses for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.save_product_progress(
  p_product_id uuid,
  p_position_seconds numeric,
  p_duration_seconds numeric default null,
  p_completed boolean default false
)
returns void
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    return;
  end if;

  insert into public.product_progresses (
    user_id,
    product_id,
    position_seconds,
    duration_seconds,
    completed
  )
  values (
    current_user_id,
    p_product_id,
    greatest(0, p_position_seconds),
    case
      when p_duration_seconds is null then null
      else greatest(0, p_duration_seconds)
    end,
    p_completed
  )
  on conflict (user_id, product_id)
  do update set
    position_seconds = excluded.position_seconds,
    duration_seconds = excluded.duration_seconds,
    completed = excluded.completed;
end;
$$;

grant execute on function public.save_product_progress(uuid, numeric, numeric, boolean)
  to anon, authenticated;
