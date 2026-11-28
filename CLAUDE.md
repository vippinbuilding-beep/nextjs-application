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

O app usa a identidade **"Espectro 2"**: interface neutra e espaçosa, com tema
**claro e escuro**, conteúdo solto sobre o fundo (seções separadas por espaço,
não por caixas), um acento só — a **aurora** (lilás → rosa → pêssego,
`border-aurora`, `bg-aurora`, `aurora-glow`) — e o amarelo só na ação
principal de cada tela. Siga estas regras em toda tela nova:

- **Sempre** envolva páginas inteiras em `LayoutBackground` (`@vippin/ui/layout-background`).
  Ele aplica só a cor de fundo do tema (a grade é opcional, `grid`). Use
  `background="primary"` (brilho da aurora) só em telas de destaque (ex.: onboarding).
- **Layout aberto** (`@vippin/ui/page-shell`): dentro do `LayoutBackground`, use
  `PageShell` (container `max-w-6xl`; `width="narrow"` para leitura/formulários,
  `"wide"` para tabelas), `PageHeader` (h1, descrição, ações; `glow` só na
  vitrine e no produto) e `Section` (h2 + conteúdo). O espaço separa os blocos
  (64–96 px entre seções); conteúdo alinhado à esquerda.
- **`Card` só agrupa o que precisa de moldura** (painel de compra, resumo,
  formulário, gráfico). Padrão `variant="surface"` (fundo + sombra suave, sem
  borda); `outline` para listas densas; `elevated` para o que flutua. Listas e
  textos ficam soltos na página. Produtos em grade: imagem com canto grande e
  título/preço abaixo, sem caixa em volta.
- **Borda ou sombra, nunca as duas** no mesmo elemento. Borda (`border-border`)
  para divisão e listas; sombra (`shadow-surface`/`shadow-elevated*`) para o que
  flutua. Campos de formulário usam `border-input` (contraste 3:1 com o fundo,
  exigido pela WCAG para limites de componentes).
- **Hierarquia de cantos**: 24–28 px em superfícies grandes (`rounded-3xl`),
  16–20 px em imagens/cards de item, 12 px em campos, botões em pílula.
- **Tipografia**: só Geist. Títulos em `font-semibold` (não `font-bold`), h1
  40–64 px, h2 20–28 px, corpo 16–18 px com linhas de até ~65 caracteres.
  **Sem rótulos em caixa alta** (`uppercase`/`tracking-wide`) e sem metadados
  colados com "·"; use sentence case e elementos separados.
- **Tema claro e escuro**: toda tela funciona nos dois. Use só tokens (eles
  trocam sozinhos com a classe `dark` no `<html>`); para um ajuste pontual,
  `dark:`. A troca é feita pelo `ThemeToggle` (`@vippin/ui/theme-toggle`), que
  anima o tema novo num círculo (`setTheme` em `@vippin/ui/lib/theme`).
- **Movimento (obrigatório: criativo, mas leve)**: o app precisa rodar liso em
  PC e celular fracos. Animação entra **onde tem função** (responder a uma
  ação, mostrar o que mudou, guiar o olhar), nunca como enfeite solto. Cada
  tela tem no máximo um momento de destaque; o resto é discreto.
  - **CSS ou Motion**: CSS para hover/foco simples, troca de cor, skeleton e
    loops pequenos. Motion (`motion.dev`) para saída de elementos
    (`AnimatePresence`), mudança de layout (`layout`, `layoutId`), altura
    `auto`, arrastar, springs que podem ser interrompidas, rolagem e
    `whileInView`.
  - **Motion**: importe sempre de `@vippin/ui/lib/motion` (nunca
    `motion/react` direto) e use `m.div`, `m.span`... (não `motion.div`). O
    `MotionProvider` (`@vippin/ui/motion-provider`, já no layout raiz dos dois
    apps) carrega o núcleo (~5 KB) e baixa as features `domAnimation` depois
    da hidratação, em modo `strict` (~14 KB a mais no total por página). Não
    importe o Motion inteiro (`motion.div`): custa ~38 KB em toda página.
    **Peso real no Turbopack**: ele não elimina bem o código não usado do
    Motion. Uma página que importa hooks ou `m` de forma estática leva
    ~50 KB a mais (a landing foi de 14 KB para 71 KB). Então: efeito simples
    (revelar ao rolar, brilho/ímã seguindo o mouse, barra que se esconde,
    linha que se desenha com a rolagem) se faz com CSS e um pouco de JS (ver
    `components/landing/landing-motion.tsx`: variáveis CSS escritas uma vez
    por frame, `IntersectionObserver`, `animation-timeline: view()`). O Motion
    fica para o que só ele faz bem (saída de elementos, layout, arrastar,
    sequências com mola) e, fora de telas que já são pesadas, entra via
    `next/dynamic` com o espaço reservado, como a vitrine do hero. Confira o
    tamanho da rota no `next build` antes de commitar.
    Componente que fica no layout raiz (todas as páginas) não importa Motion
    direto: carregue a parte animada com `next/dynamic` só quando ela for
    aparecer, como o `Toaster` faz com `toast-stack.tsx`. Para um "pulo" de
    destaque sem Motion, use `popElement` (`@vippin/ui/lib/pop`, Web
    Animations API).
  - **Overlays do Radix** (Dialog, Popover, Select) animam em CSS
    (`tw-animate-css` + springs): o Radix espera a animação de saída acabar.
    Todo filho direto de um `Portal` precisa ser o próprio conteúdo animado;
    uma `div` sem animação em volta faz o Radix desmontar na hora e corta a
    saída. Tela que
    precisa de `layout`/`layoutId`/`drag`/`Reorder` se envolve em
    `MotionMaxFeatures`, que baixa o resto sob demanda. Só em client
    components; server components ficam sem JS de animação.
  - **Springs**: use os presets `springs.snappy` (hover, toque, toggles,
    indicadores), `springs.soft` (painéis, diálogos, superfícies grandes) e
    `springs.bouncy` (só celebração) em JS, e as curvas equivalentes em CSS:
    `ease-spring`, `ease-spring-soft`, `ease-spring-bouncy` (`--spring-*` no
    `globals.css`, em `linear()`). Saídas usam `exitFast`. Duração: 150–300 ms
    para elementos pequenos, até ~500 ms para superfícies grandes.
  - Anime **só `transform`, `opacity` e `clip-path`**. Nunca
    `width`/`height`/`top`/`left` nem `box-shadow` (use `scaleX` para barras;
    sombra de hover num `::after` que aparece por `opacity`, como em
    `interactive-lift`). `filter` (blur) só em elemento pequeno. Altura `auto`
    com Motion só em conteúdo pequeno (texto expansível, erro de campo).
  - **Nada de animação de entrada no carregamento da página** (atrasa o LCP e
    briga com a hidratação): o conteúdo do servidor aparece pronto e o
    `loading.tsx` (`PageSkeleton`) cuida da espera. Na landing, o título e o
    texto principal aparecem prontos; decoração em volta pode animar.
    Conteúdo abaixo da dobra pode entrar com `whileInView` (`once: true`).
  - Efeitos que seguem o mouse (inclinação, brilho) só em
    `(hover: hover) and (pointer: fine)`; no toque, só o "apertar". Em
    callbacks por frame (`useTransform`, pointer move), sem alocar objetos e
    sem `setState`: use MotionValues.
  - Sem loop infinito, a não ser indicador pequeno (ex.: "ao vivo",
    aguardando Pix). Sem `backdrop-blur`: barras fixas usam fundo quase
    opaco (`bg-background/95`).
  - Interações em CSS: `interactive-lift` (cards clicáveis, hover só com
    mouse) e `interactive-press` (alvos de toque).
  - Movimento reduzido: o `globals.css` desliga as animações CSS e o
    `MotionConfig reducedMotion="user"` desliga transform e layout no Motion
    (mantém opacidade). Não reative.
  - Nada de `transition-all` (anima sombra e layout junto): liste as
    propriedades (`transition-[color,background-color,border-color,opacity,transform]`,
    `transition-transform`, `transition-colors`).
  - Hover só no que é clicável de verdade (itens de produto, botões). Rotas
    dinâmicas têm `loading.tsx` (`PageSkeleton`) para o clique responder na hora.
  - **Motion AI Kit (skills de animação, já no repo)**: a skill `/motion`
    (`.claude/skills/motion/`: boas práticas para React/Radix, busca na
    documentação, gerador de spring em CSS, auditoria de performance), o
    agente `motion-reviewer` (`.claude/agents/`, audita várias pastas de uma
    vez) e o servidor MCP do Motion (`.mcp.json`) estão commitados; ao abrir
    o projeto no Claude Code, aprove o servidor `motion`. Use `/motion` antes
    de criar ou mudar uma animação ("/motion anime esse diálogo", "/motion
    gere uma spring com bounce 0.3", "/motion audite
    src/components/checkout"). Para atualizar o kit, rode `npx motion-ai`
    num terminal de verdade (é interativo; não funciona pelo `!` do Claude
    Code) e commite o que mudar em `.claude/` e `.mcp.json`. Com Motion+
    (`npx motion-ai --plus`) liberam a nota MotionScore e o código dos
    exemplos; esse servidor extra pede login, então não o commite sem
    combinar com o time.

- Reuse os primitivos genéricos de `@vippin/ui/*` (`Button`, `Card`, `Input`, `Label`,
  `Textarea`, `Select`...). Componentes compostos específicos do app principal (ex.:
  `UserAvatar`, `Toaster`, `SiteLogo`, que dependem de dados/rotas do `apps/web`)
  ficam em `apps/web/src/components/ui/*`. Não recrie estilos à mão quando já
  existe um primitivo.
- Cores: use tokens (`bg-primary`, `bg-secondary`, `bg-muted`, `text-muted-foreground`),
  nunca hex fixo. Paleta: primário = amarelo `#ffe502` (ação principal),
  secundário = tinta (`#16161d` no claro / `#f2f2f7` no escuro), borda e
  divisórias finas (`border`), links e foco em violeta (`text-link`, `ring`),
  acento = aurora. Texto nunca vai em cima do gradiente; contraste 4.5:1 nos
  dois temas.
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
