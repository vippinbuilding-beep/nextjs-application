-- User profiles table.
-- Run this in the Supabase Dashboard > SQL Editor before launching the app.

create table if not exists public.profiles (
  id                  uuid        references auth.users (id) on delete cascade primary key,
  email               text,
  display_name        text,
  name                text,
  birth_date          text,
  pix_key             text,
  creator_name        text,
  socials             jsonb       default '{}'::jsonb,
  onboarding_completed boolean    default false,
  created_at          timestamptz default now() not null
);

-- Row Level Security: users can only read and write their own profile.
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
