-- Allowlist administrativa: e-mails autorizados a acessar o app @vippin/dashboard.
--
-- Segurança (defense-in-depth): esta tabela NÃO tem nenhuma policy de RLS.
-- Com RLS ligado e zero policies, nem `anon` nem `authenticated` conseguem
-- ler/escrever nada aqui. Só o service role (que bypassa RLS por definição)
-- acessa esta tabela — é assim que o middleware do dashboard verifica a
-- allowlist no servidor. Isso evita o erro comum de criar uma policy "só pra
-- admin" que na prática vazaria a lista pela anon key.

create table if not exists public.admin_users (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null unique,
  -- Nullable: o e-mail pode ser cadastrado antes do primeiro login Google do
  -- admin. É preenchido no primeiro login bem-sucedido (ver callback do
  -- dashboard), servindo de auditoria e de vínculo real com auth.users.
  user_id     uuid        references auth.users (id) on delete set null,
  -- Preparado para evoluir para múltiplos níveis (ex.: 'support') sem migração
  -- destrutiva: basta estender o CHECK abaixo.
  role        text        not null default 'admin',
  created_at  timestamptz not null default now(),
  created_by  text
);

alter table public.admin_users
  drop constraint if exists admin_users_role_valid;
alter table public.admin_users
  add constraint admin_users_role_valid
  check (role in ('admin'));

create index if not exists admin_users_user_id_idx
  on public.admin_users (user_id);

-- RLS ligado, SEM policies (só service role acessa — ver comentário acima).
alter table public.admin_users enable row level security;

notify pgrst, 'reload schema';
