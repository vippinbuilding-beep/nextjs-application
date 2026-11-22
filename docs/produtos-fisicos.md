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
5. O rastreio (cron + webhook) avança `postado → entregue`; na entrega o valor
   é **liberado** para saque. Rastreio travado → auto-liberação após
   `max(ESCROW_AUTORELEASE_DAYS, prazo + ESCROW_AUTORELEASE_EXTRA_DAYS)`.
6. Prazo perdido (não preparou / não postou) ou devolução → **reembolso
   automático** do PIX ao comprador e cancelamento da etiqueta.

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

1. Migrations novas: `20261121`…`20261127` → `supabase db push`.
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
5. Webhook (opcional): app Melhor Envio → Novo Webhook →
   `https://<domínio>/api/webhooks/melhorenvio`, com
   `MELHOR_ENVIO_WEBHOOK_SECRET` = secret do app.
6. Rollout: `PHYSICAL_PRODUCTS_CREATOR_IDS` (vazio = todos os criadores).
7. Fiscal: `ALLOW_DCE_FOR_SALES=true` libera a declaração de conteúdo. Confirme
   com o contador se a venda pode sair com DC-e ou se exige NF-e.

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
