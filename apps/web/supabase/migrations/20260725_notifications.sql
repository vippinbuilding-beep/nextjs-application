-- In-app notifications (Me Pergunte and future event types).
-- Writes are server-only (service role); users read and mark as read via RLS.

create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  type        text        not null,
  title       text        not null,
  body        text        not null,
  href        text,
  metadata    jsonb       not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at)
  where read_at is null;

alter table public.notifications
  drop constraint if exists notifications_type_valid;
alter table public.notifications
  add constraint notifications_type_valid
  check (type in (
    'ask_me_new_question',
    'ask_me_answered',
    'ask_me_refunded',
    'ask_me_payment_confirmed',
    'ask_me_deadline_soon'
  ));

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Inserts only via service role in Route Handlers / server jobs.

alter table public.notifications replica identity full;

alter publication supabase_realtime add table public.notifications;
