import "server-only";

import { formatBRL } from "@vippin/core/domain/money";
import type { Order } from "@vippin/core/models/order";
import type { OrderReturnRequest } from "@vippin/core/models/order-return";
import { sendDiscordMessage, type DiscordEmbed } from "@/lib/alerts/discord";
import { fetchProductTitle } from "@/lib/notifications/shipping-events";
import { getOrderReturnRepository } from "@vippin/supabase/factories/shipping-factory";

/**
 * Discord (ops channel) alerts for buyer returns (arrependimento). The return
 * is operated by hand at launch, so the team is warned when it is requested
 * and reminded every day while any request is still open.
 */

const RETURN_COLOR = 0xff7a00;
const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_LIST_LIMIT = 10;

function dashboardEnviosUrl(): string | null {
  const base = process.env.DASHBOARD_URL?.replace(/\/$/, "");
  return base ? `${base}/envios` : null;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function daysOpen(request: OrderReturnRequest, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - request.requestedAt.getTime()) / DAY_MS));
}

const NEXT_STEPS =
  "1) Gere a etiqueta reversa no painel da Melhor Envio. " +
  "2) Quando o produto voltar, use **Cobrar frete da devolução** e depois **Reembolsar** em Dashboard → Envios " +
  "(ou **Recusar devolução**, com o motivo).";

/** Pure: embed for a new return request. */
export function buildReturnRequestedEmbed(input: {
  request: OrderReturnRequest;
  productTitle: string;
  amountCents: number;
  deliveredAt: Date | null;
}): DiscordEmbed {
  const url = dashboardEnviosUrl();
  return {
    title: `🔁 Devolução solicitada: ${input.productTitle}`.slice(0, 256),
    ...(url ? { url } : {}),
    color: RETURN_COLOR,
    description: `O comprador pediu a devolução (direito de arrependimento). O repasse ficou retido.\n\n${NEXT_STEPS}`,
    fields: [
      { name: "Pedido", value: `\`${input.request.orderId}\``, inline: true },
      { name: "Valor", value: formatBRL(input.amountCents), inline: true },
      {
        name: "Entregue em",
        value: input.deliveredAt ? formatDate(input.deliveredAt) : "—",
        inline: true,
      },
      { name: "Motivo", value: input.request.reason.slice(0, 1000) },
    ],
    timestamp: input.request.requestedAt.toISOString(),
  };
}

/** Immediate alert when the buyer asks for a return. Never throws. */
export async function alertReturnRequested(
  request: OrderReturnRequest,
  order: Order,
  deliveredAt: Date | null
): Promise<boolean> {
  try {
    const productTitle = await fetchProductTitle(order.productId);
    return await sendDiscordMessage("ops", {
      embeds: [
        buildReturnRequestedEmbed({
          request,
          productTitle,
          amountCents: order.amountCents,
          deliveredAt,
        }),
      ],
    });
  } catch (err) {
    console.error("[returns] discord alert failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Pure: daily reminder text for the open requests (oldest first). */
export function buildOpenReturnsReminder(
  open: OrderReturnRequest[],
  now: Date
): string | null {
  if (open.length === 0) return null;
  const oldest = daysOpen(open[0]!, now);
  const header =
    open.length === 1
      ? `⏰ **1 devolução aberta** (há ${oldest} dia${oldest === 1 ? "" : "s"}).`
      : `⏰ **${open.length} devoluções abertas**, a mais antiga há ${oldest} dia${oldest === 1 ? "" : "s"}.`;
  const lines = open
    .slice(0, REMINDER_LIST_LIMIT)
    .map((r) => `• \`${r.orderId}\` · pedida em ${formatDate(r.requestedAt)} (${daysOpen(r, now)}d)`);
  if (open.length > REMINDER_LIST_LIMIT) lines.push(`• … e mais ${open.length - REMINDER_LIST_LIMIT}`);
  const url = dashboardEnviosUrl();
  return [
    header,
    "O repasse dessas vendas fica retido até alguém resolver.",
    ...lines,
    url ? `Resolver em ${url}` : "Resolva em Dashboard → Envios.",
  ].join("\n");
}

export interface OpenReturnsReminderResult {
  open: number;
  alerted: boolean;
}

/** Daily cron: reminds the team while any return request is open. */
export async function runOpenReturnsReminder(
  now: Date = new Date()
): Promise<OpenReturnsReminderResult> {
  const returns = getOrderReturnRepository();
  const open = await returns.listOpen(200);
  const message = buildOpenReturnsReminder(open, now);
  if (!message) return { open: 0, alerted: false };

  const alerted = await sendDiscordMessage("ops", message);
  if (alerted) await returns.markAlerted(open.map((r) => r.id), now);
  return { open: open.length, alerted };
}
