-- "Me Pergunte": optional paid Q&A for creators.
-- Payment is held on the platform until the creator answers (repass 90%) or
-- declines / misses the 72h deadline (refund to asker via PIX).

-- ── Creator settings on profiles ─────────────────────────────────────────────

alter table public.profiles
  add column if not exists ask_me_enabled boolean not null default false,
  add column if not exists ask_me_price_cents integer;

alter table public.profiles
  drop constraint if exists profiles_ask_me_price_min;
alter table public.profiles
  add constraint profiles_ask_me_price_min
  check (ask_me_price_cents is null or ask_me_price_cents >= 300);

-- Public view: expose whether ask-me is on and the price (no PII).
create or replace view public.public_profiles
with (security_invoker = false)
as
  select
    id,
    creator_name,
    name,
    slug,
    socials,
    avatar_path,
    avatar_url,
    ask_me_enabled,
    ask_me_price_cents
  from public.profiles
  where slug is not null;

grant select on public.public_profiles to anon, authenticated;

-- ── Questions ───────────────────────────────────────────────────────────────

create table if not exists public.ask_me_questions (
  id                    uuid        primary key default gen_random_uuid(),
  creator_id            uuid        not null references public.profiles (id) on delete cascade,
  asker_id              uuid        not null references auth.users (id) on delete cascade,
  question_text         text        not null,
  answer_text           text,
  answer_video_path     text,
  answer_video_mime     text,
  -- Payment + split (integer cents).
  amount_cents          integer     not null,
  platform_fee_cents    integer     not null,
  creator_amount_cents  integer     not null,
  -- Lifecycle: pending_payment → awaiting_response → answered | declined | expired
  status                text        not null default 'pending_payment',
  abacate_charge_id     text,
  br_code               text,
  br_code_base64        text,
  charge_expires_at     timestamptz,
  paid_at               timestamptz,
  response_deadline_at  timestamptz,
  answered_at           timestamptz,
  declined_at           timestamptz,
  refunded_at           timestamptz,
  -- Asker PIX for refunds (copied from profile at checkout).
  refund_pix_key        text,
  refund_pix_key_type   text,
  -- held = paid, waiting for answer; sent = repassed to creator; refunded = back to asker
  transfer_status       text        not null default 'pending',
  abacate_transfer_id   text,
  transfer_error        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists ask_me_questions_creator_id_idx
  on public.ask_me_questions (creator_id, created_at desc);

create index if not exists ask_me_questions_asker_id_idx
  on public.ask_me_questions (asker_id, created_at desc);

create index if not exists ask_me_questions_abacate_charge_id_idx
  on public.ask_me_questions (abacate_charge_id);

create index if not exists ask_me_questions_awaiting_deadline_idx
  on public.ask_me_questions (status, response_deadline_at)
  where status = 'awaiting_response';

alter table public.ask_me_questions
  drop constraint if exists ask_me_questions_status_valid;
alter table public.ask_me_questions
  add constraint ask_me_questions_status_valid
  check (status in (
    'pending_payment',
    'awaiting_response',
    'answered',
    'declined',
    'expired',
    'payment_expired',
    'failed'
  ));

alter table public.ask_me_questions
  drop constraint if exists ask_me_questions_transfer_status_valid;
alter table public.ask_me_questions
  add constraint ask_me_questions_transfer_status_valid
  check (transfer_status in ('pending', 'held', 'sent', 'refunded', 'failed'));

alter table public.ask_me_questions
  drop constraint if exists ask_me_questions_amounts_positive;
alter table public.ask_me_questions
  add constraint ask_me_questions_amounts_positive
  check (
    amount_cents > 0
    and platform_fee_cents >= 0
    and creator_amount_cents >= 0
  );

alter table public.ask_me_questions
  drop constraint if exists ask_me_questions_split_sums;
alter table public.ask_me_questions
  add constraint ask_me_questions_split_sums
  check (amount_cents = platform_fee_cents + creator_amount_cents);

alter table public.ask_me_questions
  drop constraint if exists ask_me_questions_question_len;
alter table public.ask_me_questions
  add constraint ask_me_questions_question_len
  check (char_length(question_text) between 10 and 500);

alter table public.ask_me_questions
  drop constraint if exists ask_me_questions_answer_text_len;
alter table public.ask_me_questions
  add constraint ask_me_questions_answer_text_len
  check (answer_text is null or char_length(answer_text) between 1 and 2000);

create or replace function public.set_ask_me_questions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ask_me_questions_set_updated_at on public.ask_me_questions;
create trigger ask_me_questions_set_updated_at
  before update on public.ask_me_questions
  for each row
  execute function public.set_ask_me_questions_updated_at();

alter table public.ask_me_questions enable row level security;

-- Askers read their own questions.
drop policy if exists "Askers read own ask me questions" on public.ask_me_questions;
create policy "Askers read own ask me questions"
  on public.ask_me_questions for select
  to authenticated
  using (auth.uid() = asker_id);

-- Creators read questions sent to them.
drop policy if exists "Creators read received ask me questions" on public.ask_me_questions;
create policy "Creators read received ask me questions"
  on public.ask_me_questions for select
  to authenticated
  using (auth.uid() = creator_id);

-- No insert/update/delete for clients — all writes via service role in Route Handlers.

-- ── Storage for answer videos ───────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('ask-me-answers', 'ask-me-answers', false, 104857600)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "Creators upload own ask me answer videos" on storage.objects;
create policy "Creators upload own ask me answer videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ask-me-answers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators update own ask me answer videos" on storage.objects;
create policy "Creators update own ask me answer videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'ask-me-answers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'ask-me-answers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators delete own ask me answer videos" on storage.objects;
create policy "Creators delete own ask me answer videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'ask-me-answers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
