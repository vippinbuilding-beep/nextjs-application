-- Adds/refreshes the RPC used by the video player to save progress without
-- calling the auth user endpoint from the browser.

alter table public.product_progresses
  alter column user_id set default auth.uid();

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

notify pgrst, 'reload schema';
