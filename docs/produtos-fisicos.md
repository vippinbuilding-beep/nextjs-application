# Produtos físicos + Melhor Envio

Fluxo de venda de produtos físicos com frete pela Melhor Envio (conta central
da Vippin), etiqueta gerada pelo criador e **retenção (escrow) até a entrega**.
Plano completo: Project doc `claude/plano-produtos-fisicos-melhor-envio.md`.

## Como funciona

1. **Criador** cadastra o endereço de remetente em **Painel → Envios** e cria um
   produto do tipo *Produto físico* (peso/medidas da embalagem, estoque e quem
   paga o frete: comprador ou **frete grátis**).
2. **Comprador** informa o endereço na página do produto, escolhe o frete e paga
   o PIX (produto + frete, ou só o produto quando o frete é grátis). O servidor
   recota o frete antes de cobrar.
3. Pago → o pedido entra em **retenção** (`transfer_status = held`), o estoque é
   baixado e o criador tem `PREPARE_DEADLINE_DAYS` para **Preparar envio**.
4. **Preparar envio** compra a etiqueta na Melhor Carteira da Vippin (carrinho →
   checkout → gerar), com NF-e (chave) ou declaração de conteúdo. O criador
   imprime (individual ou em lote) e posta em até `POST_DEADLINE_DAYS`.
5. O rastreio (cron + webhook) avança `postado → entregue`; o valor é
   **liberado** para saque `ESCROW_DISPUTE_BUFFER_DAYS` (7) dias após a entrega,
   prazo do direito de arrependimento. Rastreio travado → auto-liberação após
   `max(ESCROW_AUTORELEASE_DAYS, prazo + ESCROW_AUTORELEASE_EXTRA_DAYS)`.
6. Prazo perdido (não preparou / não postou) ou devolução → **reembolso
   automático** do PIX ao comprador e cancelamento da etiqueta.
7. **Arrependimento** (até `RETURN_WINDOW_DAYS` = 7 dias após a entrega): o
   comprador clica em **Quero devolver** em *Meus pedidos* e conta o motivo. O
   pedido fica retido (`admin_hold_at`, bloqueia a liberação automática), o
   criador é notificado e a equipe recebe alerta no Discord, com lembrete diário
   enquanto houver devolução aberta. A devolução é manual (ver Admin).

### Perfil fiscal, termos e limite de pessoa física

- O criador escolhe o perfil no endereço de remetente: **Pessoa física** (CPF),
  **MEI** ou **Empresa** (CNPJ). Documento aceito na etiqueta
  (`@vippin/core/domain/seller-profile`): PF → só DC-e; MEI → NF-e ou DC-e
  (`ALLOW_DCE_FOR_MEI`); Empresa → só NF-e. CNPJ antigo sem perfil escolhido
  conta como MEI até o criador escolher. Mudanças ficam em
  `seller_profile_changes`.
- A chave da NF-e é conferida com o CNPJ (posições 7–20) e a UF (código IBGE,
  posições 1–2) do remetente, no client e no servidor (`nfe-key.ts`).
- **Limite mensal de PF** (`PF_MONTHLY_ORDER_LIMIT` / `PF_MONTHLY_AMOUNT_LIMIT_CENTS`,
  pedidos físicos pagos no mês, fuso de Brasília): aviso "Formalize como MEI" a
  partir de `PF_LIMIT_WARNING_PERCENT`; no limite, cotação e checkout recusam e
  a página do produto mostra "Indisponível no momento". Pedidos já pagos seguem.
- Tudo isso é checado **antes** da venda (`lib/shipping/seller-eligibility.ts`,
  usado na cotação, no checkout e na página do produto), para nunca haver venda
  de quem não conseguiria gerar a etiqueta.
- **Termos do vendedor** (`@vippin/core/domain/seller-terms`, versão em
  `SELLER_TERMS_VERSION` e em `current_seller_terms_version()` no banco): aceite
  obrigatório antes de publicar produto físico, registrado em
  `seller_terms_acceptances` (o banco recusa produto físico ativo sem aceite).
  O aceite da DC-e de cada envio é gravado no shipment (`dce_accepted_at` +
  versão). Texto em **rascunho**: revisar com jurídico/contador.
- Página do produto físico mostra **Vendido por** (nome, CPF/CNPJ mascarado,
  cidade/UF, contato) via RPC `get_public_seller_info`, sem endereço nem
  documento completo.

### Dinheiro (`@vippin/core/domain/shipping`)

```
buyer_pays: PIX = preço + frete;  taxa sobre o preço;        criador = accrued(preço)
free:       PIX = preço;          taxa sobre preço − frete;  criador = accrued(preço − frete)
amount = platform_fee + creator_amount + shipping_charged + shipping_absorbed  (CHECK no banco)
```

Divergência de preço da etiqueta → absorvida pela plataforma (ledger
`shipping_adjustments`). Medidas alteradas pelo criador ou divergência cobrada
pela transportadora → descontadas no próximo saque do criador.

## Configuração

1. Migrations novas: `20261121`…`20261202` → `supabase db push`.
2. Variáveis: veja o bloco "Produtos físicos / Melhor Envio" em
   `apps/web/.env.local.example` e "Envios" em `apps/dashboard/.env.local.example`.
   Mínimo: `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_SANDBOX=true`,
   `MELHOR_ENVIO_USER_AGENT`, `ADMIN_API_SECRET` (nos dois apps) e
   `WEB_APP_URL` (dashboard).
3. Conta Melhor Envio: **verificada** (para cancelar etiqueta já impressa), com
   saldo na Melhor Carteira e, de preferência, limite de etiquetas não postadas
   aumentado (a conta é compartilhada por todos os criadores).
4. Cron: `/api/cron/daily-payments` (já no `vercel.json`) também sincroniza o
   rastreio e aplica as regras de escrow. Para atualizar mais rápido, agende
   `/api/cron/shipping-sync` de hora em hora (Vercel Pro ou cron externo com
   `Authorization: Bearer $CRON_SECRET`).
5. Alertas no Discord: `DISCORD_ALERT_WEBHOOK_URL` (webhook do canal da
   equipe). O cron diário avisa quando o saldo da Melhor Carteira fica abaixo
   de `MELHOR_ENVIO_LOW_BALANCE_CENTS` (padrão R$ 150), e o preparo do envio
   avisa na hora quando um criador trava por saldo, limite de etiquetas, token
   ou Melhor Envio fora do ar. Cada pedido de devolução gera um alerta na hora
   e o cron diário lembra enquanto houver devolução aberta (`DASHBOARD_URL`
   coloca o link do dashboard na mensagem). Vendas pagas (digitais e físicas)
   vão para outro canal, via `DISCORD_SALES_WEBHOOK_URL`.
6. Webhook (opcional): app Melhor Envio → Novo Webhook →
   `https://<domínio>/api/webhooks/melhorenvio`, com
   `MELHOR_ENVIO_WEBHOOK_SECRET` = secret do app.
7. Rollout: `PHYSICAL_PRODUCTS_CREATOR_IDS` (vazio = todos os criadores).
8. Fiscal: as regras por perfil valem sozinhas; `ALLOW_DCE_FOR_SALES=false`
   desliga a DC-e para todos (kill switch). Sem `MELHOR_ENVIO_SERVICE_IDS`, só
   Correios (PAC, SEDEX, Mini Envios).

## Testar sem credenciais

`MELHOR_ENVIO_MOCK=true` usa um gateway simulado (cotação determinística,
etiqueta falsa, rastreio que avança a cada sincronização). Com o AbacatePay em
dev mode dá para percorrer: comprar → preparar envio → rodar
`/api/cron/shipping-sync?secret=$CRON_SECRET` duas vezes → pedido entregue e
liberado no Financeiro.

## Admin

`apps/dashboard` → **Envios**: saldo da Melhor Carteira, etiquetas abertas,
valor em retenção, pedidos que precisam de atenção e ações **Liberar / Reter /
Reembolsar / Cobrar do criador** (auditadas em `fulfillment_events` /
`shipping_adjustments`), executadas pela rota interna `/api/admin/escrow`.

**Devoluções solicitadas** aparecem em destaque (motivo e dias em aberto).
Roteiro manual: gerar a etiqueta reversa no painel da Melhor Envio e mandar ao
comprador → quando o produto voltar, **Cobrar frete da devolução** (lança
`return_cost` para o criador) e **Reembolsar** (fecha a devolução). Se não
couber, **Recusar devolução** com o motivo (libera o repasse). Enquanto houver
devolução aberta, **Liberar** fica bloqueado.
