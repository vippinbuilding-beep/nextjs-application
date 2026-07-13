# CLAUDE.md

Guia de convenções do projeto **Vippin**. Leia antes de criar telas, componentes
ou acessar dados. O objetivo é manter consistência visual e de arquitetura para
que detalhes não passem despercebidos.

## Monorepo

O projeto é um monorepo **pnpm workspaces + Turborepo**. Cada app roda com
`next dev --turbopack` / `next build --turbopack`.

```
apps/
  web/        -> @vippin/web (app principal, produtos/criadores/consumidores)
  dashboard/  -> @vippin/dashboard (painel administrativo, em construção)
packages/
  core/       -> @vippin/core (models + repository interfaces, backend-agnóstico)
  supabase/   -> @vippin/supabase (implementações Supabase/AbacatePay + clients)
  ui/         -> @vippin/ui (shadcn primitives + design tokens compartilhados)
  config/     -> @vippin/config (tsconfig base + eslint compartilhado)
```

- Comandos na raiz: `pnpm dev` (todos os apps via turbo), `pnpm dev:web`,
  `pnpm dev:dashboard`, `pnpm build`, `pnpm lint`, `pnpm typecheck`.
- Cada pacote compartilhado expõe subpaths via `exports` no `package.json` (ex.:
  `@vippin/core/models/user`, `@vippin/ui/button`, `@vippin/supabase/client/client`)
  e é consumido como TypeScript-fonte direto (sem build), então todo app que o usa
  precisa listá-lo em `transpilePackages` no `next.config.mjs`.
- **Onde colocar código novo**: se for usado só por um app, fica em `apps/<app>/src`.
  Se for reutilizável (modelo de domínio, repositório, componente shadcn genérico,
  helper de auth/storage do Supabase), vai para o pacote compartilhado correspondente
  — não duplique entre `apps/web` e `apps/dashboard`.
- Deploy (Vercel): configure o **Root Directory** do projeto para `apps/web` ou
  `apps/dashboard` (um projeto Vercel por app).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (estilo "new-york") + ícones `lucide-react`
- Supabase (Auth com Google OAuth, Postgres com RLS e Storage)
- Idioma da UI: **pt-BR** em todo texto voltado ao usuário.
- Plataforma de pagamentos: **AbacatePay**, usar o SDK para integrar com a API.

## UI / Layout (IMPORTANTE)

O app usa um visual "cartoon": bordas pretas grossas (`border-2 border-border`),
cantos arredondados (`rounded-xl` / `rounded-2xl`) e sombras duras
(`shadow-cartoon`, `-sm`, `-lg`). Siga estas regras em toda tela nova:

- **Sempre** envolva páginas inteiras em `LayoutBackground` (`@vippin/ui/layout-background`).
  Ele aplica o fundo padrão com grade de pontos. Use `background="primary"` só
  para telas de destaque (ex.: onboarding).
- **Centralize o conteúdo**: `className="flex min-h-svh flex-col items-center justify-center p-4 py-10"`
  no `LayoutBackground`, com um container interno `flex w-full max-w-md flex-col gap-6`.
  Use `max-w-md` para fluxos de formulário/cards; listas mais largas podem usar `max-w-2xl`.
- **Nada solto fora de `Card`**: botões de ação (Voltar, submit, etc.) e conteúdo
  devem ficar **dentro** de um `Card`/`CardContent`, não flutuando ao lado dele.
  Padrão de navegação: botões `Voltar` (variant `outline`) e ação primária dentro
  do card, como em `product-form.tsx`.
- Reuse os primitivos genéricos de `@vippin/ui/*` (`Button`, `Card`, `Input`, `Label`,
  `Textarea`, `Select`...). Componentes compostos específicos do app principal (ex.:
  `UserAvatar`, `Toaster`, `SiteLogo`, que dependem de dados/rotas do `apps/web`)
  ficam em `apps/web/src/components/ui/*`. Não recrie estilos à mão quando já
  existe um primitivo.
- Cores: use tokens (`bg-primary`, `bg-secondary`, `bg-muted`, `text-muted-foreground`),
  nunca hex fixo. Paleta: primário = amarelo `#ffe502`, secundário/borda = preto.
  Os tokens vivem em `packages/ui/src/styles/globals.css`; o `globals.css` de cada
  app só faz `@import "@vippin/ui/styles/globals.css";`.
- Estados de carregamento de página inteira usam `ScreenLoading` (`@vippin/ui/screen-loading`).

## Arquitetura de dados (repository pattern)

Nunca chame o Supabase direto da UI. O fluxo é:

```
@vippin/core (models + repository interfaces)
  -> @vippin/supabase/infrastructure/supabase (implementações)
  -> @vippin/supabase/factories/repository-factory (composição)
  -> UI (usa os repositórios exportados pela factory)
```

- Modelos de domínio em `packages/core/src/models/*` são **backend-agnósticos**
  (camelCase, sem tipos do Supabase). Regras/constantes de negócio puras e
  reutilizáveis (limites, formatação de dinheiro, validação) ficam em
  `packages/core/src/domain/*` (ex.: `@vippin/core/domain/money`,
  `@vippin/core/domain/ask-me`).
- Interfaces em `packages/core/src/repositories/*`; implementações em
  `packages/supabase/src/infrastructure/supabase/*` (mapeiam snake_case <->
  camelCase via `toXxx`).
- Registre novos repositórios em `packages/supabase/src/factories/repository-factory.ts`
  e importe deles na UI
  (`import { productRepository } from "@vippin/supabase/factories/repository-factory"`).
  Isso vale para os dois apps — qualquer repositório novo fica disponível tanto
  para `apps/web` quanto `apps/dashboard`.
- Exceção: Server Components/Route Handlers podem usar `createSupabaseServerClient`
  (`@vippin/supabase/client/server`) diretamente para leituras públicas e checagem
  de auth (ver páginas em `app/[creator]`).

## Supabase: banco, RLS e Storage

- Migrations ficam em `apps/web/supabase/migrations/`, nomeadas por data + assunto
  (ex.: `20260704_products.sql`, `20260705_product_slug.sql`). Divida por assunto
  (tabela / RPC / storage). **Cada arquivo precisa de um prefixo de data único**
  (`YYYYMMDD`): o Supabase usa só essa parte como versão; dois arquivos com o
  mesmo dia (ex.: três `20260703_*.sql`) causam erro de chave duplicada no push.
  A tabela deve ser criada antes da RPC que a referencia.
- **Defense-in-depth**: o browser fala direto com o Supabase (anon key), então
  toda tabela precisa de **RLS** e de **CHECK constraints** para validar dados.
  Validação no client é só UX; a garantia real é no banco.
- Geração de slug único é feita por RPC `SECURITY DEFINER` (ex.: `claim_profile_slug`,
  `claim_product_slug`) + índice único como guarda final contra corrida.
- Arquivos vão para o bucket **privado** `products` no caminho `{userId}/{id}/{arquivo}`.
  O browser **nunca** acessa o Storage direto: ele só fala com Route Handlers em
  `apps/web/src/app/api/products/[id]/*` (`media` valida o token e **redireciona (302)**
  para uma signed URL de sessão — o Storage serve Range nativo, então o player
  faz seek/buffer direto na CDN; `download` entrega o documento; `thumbnail`
  redireciona para uma signed URL curta). Nomes de bucket ficam em
  `@vippin/supabase/constants/buckets`; `apps/web/src/lib/supabase/storage.ts` só
  monta os caminhos dessas rotas (específico do `apps/web`).
- Upload é **presigned**: a UI pede uma signed upload URL para
  `POST /api/products/[id]/upload-url` (valida dono + tamanho no servidor) e sobe
  direto para o Storage via `uploadToSignedUrl`.
- **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`): usada **apenas no servidor**,
  dentro dos Route Handlers, via `@vippin/supabase/client/admin` (marcado com
  `server-only` para nunca ir ao cliente). Serve para gerar signed URLs do bucket
  privado. As rotas de mídia são protegidas por tokens HMAC de curta duração
  (`MEDIA_TOKEN_SECRET`, ver `@/lib/security/media-token` em `apps/web`) emitidos
  nos Server Components. Nunca use a service role no cliente.
- Limite de upload: a UI valida até 500 MB (vídeo) / 100 MB (documento), mas o
  **Supabase impõe um teto no servidor**. Configure em dois lugares:
  1. **Dashboard** → Project Settings → Storage → **Global file size limit**
     (plano Free: máx. **50 MB**; Pro: até 500 MB+).

2.  Migration `20260707_storage_file_size_limit.sql` define `file_size_limit`
    do bucket `products` (500 MB). Rode `supabase db push` após alterar o global.

- O bucket `products` é **privado** (`20260710_private_products_bucket.sql`): não há
  leitura pública. As escritas continuam com a anon key + RLS por pasta
  (`{userId}/...`); as leituras passam por signed URLs geradas com a service role
  no servidor.

## Dinheiro

- Preços são **sempre** salvos em centavos (inteiro, coluna `*_cents`).
- Converta/formate só na borda da UI com `@vippin/core/domain/money` (`formatBRL`,
  `parseReaisToCents`, `centsToReaisInput`).

## Formulários

- Padrão: `useState` + validação manual (não usamos react-hook-form nem zod).
- Espelhe o estilo de `src/components/onboarding` e `src/components/products/product-form.tsx`
  (dentro de `apps/web`).

## Rotas e proteção

- Rotas protegidas: adicione o prefixo em `PROTECTED_PREFIXES` de
  `apps/web/src/lib/supabase/middleware.ts`. Além disso, as páginas client checam
  `user`/`onboardingCompleted` e redirecionam. O `apps/dashboard` ainda não tem
  auth/middleware própria — replique esse padrão quando for adicionar proteção lá.
- Handle público do criador: `/@{slug}`; produto: `/@{slug}/{productSlug}`.
  A resolução aceita slug com ou sem `@` (removemos o `@` inicial).

## Antes de finalizar

Rode na raiz do monorepo e garanta que passam sem erros:

```bash
pnpm lint
pnpm typecheck
```

Ou, dentro de um app específico (`apps/web` ou `apps/dashboard`):

```bash
npm run lint
npx tsc --noEmit
```
