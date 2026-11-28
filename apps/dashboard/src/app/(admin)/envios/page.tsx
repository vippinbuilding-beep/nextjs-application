import { FULFILLMENT_LABELS } from "@vippin/core/domain/fulfillment";
import { formatBRL } from "@vippin/core/domain/money";
import type { FulfillmentStatus, Order } from "@vippin/core/models/order";
import type { Shipment } from "@vippin/core/models/shipment";
import { adminOrderRepository } from "@vippin/supabase/factories/admin-repository-factory";
import {
  getOrderReturnRepository,
  getShipmentRepository,
  getShippingGateway,
} from "@vippin/supabase/factories/shipping-factory";
import { Card, CardContent, CardHeader, CardTitle } from "@vippin/ui/card";
import { StatCard } from "@vippin/ui/stat-card";

import { EscrowActionsForm } from "./escrow-actions-form";

export const dynamic = "force-dynamic";

const ACTIVE: FulfillmentStatus[] = [
  "awaiting_shipment",
  "label_ready",
  "posted",
  "in_transit",
  "delivered",
  "released",
  "refund_pending",
];

const LOW_BALANCE_CENTS = Number.parseInt(process.env.MELHOR_ENVIO_LOW_BALANCE_CENTS ?? "15000", 10);

function shortId(id: string) {
  return id.slice(0, 8);
}

function formatDate(date?: Date) {
  if (!date) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

async function loadBalance(): Promise<number | null> {
  try {
    return await getShippingGateway().getBalanceCents();
  } catch {
    return null;
  }
}

function isStuck(order: Order, shipment: Shipment | undefined, now: number): boolean {
  if (order.fulfillmentStatus === "refund_pending") return true;
  if (shipment?.status === "purchase_failed") return true;
  if (order.fulfillmentStatus === "posted" && shipment?.postedAt) {
    return now - shipment.postedAt.getTime() > 10 * 24 * 60 * 60 * 1000;
  }
  return false;
}

export default async function EnviosPage() {
  const shipments = getShipmentRepository();
  const [orders, balanceCents, openLabels, openReturns] = await Promise.all([
    adminOrderRepository.listByFulfillmentStatus(ACTIVE, 300),
    loadBalance(),
    shipments.countOpenLabels().catch(() => null),
    getOrderReturnRepository().listOpen(100),
  ]);
  const openReturnByOrder = new Map(openReturns.map((r) => [r.orderId, r]));
  const byOrder = new Map(
    (await shipments.listByOrderIds(orders.map((o) => o.id))).map((s) => [s.orderId, s])
  );
  const now = Date.now();
  const stuck = orders.filter((o) => isStuck(o, byOrder.get(o.id), now));
  const heldCents = orders
    .filter((o) => o.transferStatus === "held")
    .reduce((sum, o) => sum + o.creatorAmountCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">Envios</h1>
        <p className="text-muted-foreground text-sm font-medium">
          Produtos físicos, carteira Melhor Envio e overrides do escrow.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Saldo Melhor Carteira"
          value={balanceCents === null ? "Indisponível" : formatBRL(balanceCents)}
        />
        <StatCard label="Etiquetas abertas" value={openLabels === null ? "—" : String(openLabels)} />
        <StatCard label="Em retenção (criadores)" value={formatBRL(heldCents)} />
        <StatCard label="Precisam de atenção" value={String(stuck.length)} />
        <StatCard label="Devoluções abertas" value={String(openReturns.length)} />
      </div>

      {openReturns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Devoluções solicitadas ({openReturns.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground text-xs font-medium">
              Gere a etiqueta reversa no painel da Melhor Envio e mande ao comprador. Quando o
              produto voltar: primeiro <strong>Cobrar frete da devolução</strong> (valor da etiqueta
              reversa), depois <strong>Reembolsar</strong>. Se não couber devolução, <strong>Recusar devolução</strong>{" "}
              com o motivo (libera o repasse). As ações ficam na linha do pedido abaixo.
            </p>
            <ul className="flex flex-col gap-2">
              {openReturns.map((request) => {
                const days = Math.floor((now - request.requestedAt.getTime()) / (24 * 60 * 60 * 1000));
                return (
                  <li key={request.id} className="rounded-xl border border-border p-3">
                    <p className="text-xs">
                      <span className="font-mono">{shortId(request.orderId)}</span> · pedida em{" "}
                      {formatDate(request.requestedAt)} ·{" "}
                      <span className={days >= 3 ? "text-destructive font-semibold" : "font-semibold"}>
                        {days} dia{days === 1 ? "" : "s"} em aberto
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">Motivo: {request.reason}</p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {balanceCents !== null && balanceCents < LOW_BALANCE_CENTS && (
        <p className="rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive">
          Saldo baixo na Melhor Carteira: novas etiquetas podem falhar. Reponha o saldo.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pedidos físicos em andamento ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum pedido físico em andamento.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs">
                  <th className="py-2 pr-3">Pedido</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Envio</th>
                  <th className="py-2 pr-3 text-right">Valores</th>
                  <th className="py-2 pr-3">Prazos</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const shipment = byOrder.get(order.id);
                  const attention = isStuck(order, shipment, now);
                  return (
                    <tr key={order.id} className="border-b border-border/40 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-mono text-xs">{shortId(order.id)}</p>
                        <p className="text-muted-foreground text-xs">criador {shortId(order.creatorId)}</p>
                        {attention && (
                          <span className="mt-1 inline-block rounded-full border border-destructive px-2 text-[10px] font-semibold text-destructive">
                            atenção
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-semibold">{FULFILLMENT_LABELS[order.fulfillmentStatus]}</p>
                        <p className="text-muted-foreground text-xs">repasse: {order.transferStatus}</p>
                        {openReturnByOrder.has(order.id) ? (
                          <p className="text-destructive text-xs font-semibold">devolução solicitada</p>
                        ) : (
                          order.adminHoldAt && (
                            <p className="text-destructive text-xs font-semibold">retido pelo admin</p>
                          )
                        )}
                      </td>
                      <td className="py-3 pr-3 text-xs">
                        <p>
                          {order.shippingQuote?.company} {order.shippingQuote?.serviceName}
                        </p>
                        <p className="text-muted-foreground">
                          {shipment?.status ?? "—"}
                          {shipment?.trackingCode ? ` · ${shipment.trackingCode}` : ""}
                        </p>
                        {shipment?.error && (
                          <p className="text-destructive max-w-56 truncate" title={shipment.error}>
                            {shipment.error}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right text-xs">
                        <p className="font-semibold">{formatBRL(order.amountCents)}</p>
                        <p className="text-muted-foreground">criador {formatBRL(order.creatorAmountCents)}</p>
                        <p className="text-muted-foreground">
                          frete cot. {formatBRL(order.shippingQuote?.priceCents ?? 0)}
                          {order.shippingCostCents !== undefined
                            ? ` · real ${formatBRL(order.shippingCostCents)}`
                            : ""}
                        </p>
                      </td>
                      <td className="py-3 pr-3 text-xs">
                        <p>Pago {formatDate(order.paidAt)}</p>
                        {order.fulfillmentStatus === "awaiting_shipment" && (
                          <p>Preparar até {formatDate(order.prepareDeadlineAt)}</p>
                        )}
                        {order.fulfillmentStatus === "label_ready" && (
                          <p>Postar até {formatDate(order.postDeadlineAt)}</p>
                        )}
                        {shipment?.postedAt && <p>Postado {formatDate(shipment.postedAt)}</p>}
                      </td>
                      <td className="py-3">
                        <EscrowActionsForm
                          orderId={order.id}
                          canRelease={
                            !openReturnByOrder.has(order.id) &&
                            ["posted", "in_transit", "delivered"].includes(order.fulfillmentStatus)
                          }
                          hasOpenReturn={openReturnByOrder.has(order.id)}
                          canHold={
                            !order.adminHoldAt &&
                            (["awaiting_shipment", "label_ready", "posted", "in_transit", "delivered"].includes(
                              order.fulfillmentStatus
                            ) ||
                              (order.fulfillmentStatus === "released" && order.transferStatus === "pending"))
                          }
                          canRefund={order.fulfillmentStatus !== "released" && order.fulfillmentStatus !== "refunded"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
