"use client";

import { Package } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@vippin/ui/button";
import { Label } from "@vippin/ui/label";
import { Loading } from "@vippin/ui/loading";
import { Textarea } from "@vippin/ui/textarea";
import { formatBRL } from "@vippin/core/domain/money";
import {
  RETURN_REASON_MAX_LENGTH,
  RETURN_STATUS_LABELS,
  validateReturnReason,
  type ReturnRequestStatus,
} from "@vippin/core/domain/returns";
import type { FulfillmentStatus } from "@vippin/core/models/order";
import { cn } from "@vippin/ui/lib/utils";

interface BuyerOrder {
  orderId: string;
  productTitle: string;
  productHref: string | null;
  fulfillmentStatus: FulfillmentStatus;
  statusLabel: string;
  amountCents: number;
  shippingChargedCents: number;
  serviceName: string | null;
  company: string | null;
  deliveryDays: number | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
  returnStatus: ReturnRequestStatus | null;
  canRequestReturn: boolean;
  returnWindowEndsAt: string | null;
}

const STEPS: { status: FulfillmentStatus[]; label: string }[] = [
  { status: ["awaiting_shipment"], label: "Pago" },
  { status: ["label_ready"], label: "Preparando" },
  { status: ["posted", "in_transit"], label: "A caminho" },
  { status: ["delivered", "released"], label: "Entregue" },
];

function stepIndex(status: FulfillmentStatus): number {
  return STEPS.findIndex((step) => step.status.includes(status));
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

/** "Quero devolver" (arrependimento): reason form inside the order card. */
function ReturnRequestBox({
  item,
  onRequested,
}: {
  item: BuyerOrder;
  onRequested: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (item.returnStatus) {
    return (
      <p className="rounded-xl border border-border bg-muted p-3 text-xs font-medium">
        <span className="font-bold">{RETURN_STATUS_LABELS[item.returnStatus]}.</span>{" "}
        {item.returnStatus === "open"
          ? "A equipe Vippin vai te enviar as instruções para devolver o produto. O reembolso sai no PIX usado na compra."
          : ""}
      </p>
    );
  }
  if (!item.canRequestReturn) return null;

  async function submit() {
    const validation = validateReturnReason(reason);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch(`/api/orders/${item.orderId}/return`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Não foi possível pedir a devolução.");
      onRequested();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível pedir a devolução.");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          Você pode desistir da compra até {formatDate(item.returnWindowEndsAt)}.
        </span>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Quero devolver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted p-3">
      <Label htmlFor={`return-${item.orderId}`}>Por que você quer devolver?</Label>
      <Textarea
        id={`return-${item.orderId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, RETURN_REASON_MAX_LENGTH))}
        placeholder="Conte o que aconteceu (ex.: desisti da compra, veio diferente do anúncio...)"
        disabled={sending}
        rows={3}
      />
      <p className="text-muted-foreground text-xs">
        O produto precisa voltar sem uso e na embalagem. A equipe Vippin te envia a etiqueta de
        devolução e o valor é reembolsado no PIX usado na compra.
      </p>
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={sending}>
          Voltar
        </Button>
        <Button size="sm" onClick={() => void submit()} disabled={sending}>
          {sending ? "Enviando..." : "Pedir devolução"}
        </Button>
      </div>
    </div>
  );
}

/** Buyer "Meus pedidos": physical orders with progress and tracking. */
export function BuyerOrdersList() {
  const [items, setItems] = useState<BuyerOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders/physical", { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json()) as { items?: BuyerOrder[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Não foi possível carregar seus pedidos.");
        setItems(body.items ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error}
      </p>
    );
  }

  if (!items) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loading />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted">
          <Package className="size-6" />
        </span>
        <p className="text-muted-foreground text-sm">Você ainda não comprou produtos físicos.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const refunded = item.fulfillmentStatus === "refunded" || item.fulfillmentStatus === "refund_pending";
        const current = stepIndex(item.fulfillmentStatus);
        return (
          <li
            key={item.orderId}
            className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-elevated-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {item.productHref ? (
                  <Link href={item.productHref} className="font-bold hover:underline">
                    {item.productTitle}
                  </Link>
                ) : (
                  <p className="font-bold">{item.productTitle}</p>
                )}
                <p className="text-muted-foreground text-xs">
                  {formatBRL(item.amountCents)}
                  {item.shippingChargedCents > 0
                    ? ` (frete ${formatBRL(item.shippingChargedCents)})`
                    : " · frete grátis"}
                  {item.paidAt ? ` · pago em ${formatDate(item.paidAt)}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-bold",
                  refunded ? "bg-muted" : "bg-primary"
                )}
              >
                {item.statusLabel}
              </span>
            </div>

            {!refunded && (
              <ol className="grid grid-cols-4 gap-1">
                {STEPS.map((step, index) => (
                  <li key={step.label} className="flex flex-col gap-1">
                    <span
                      className={cn(
                        "h-2 rounded-full border border-border",
                        index <= current ? "bg-primary" : "bg-muted"
                      )}
                    />
                    <span className="text-muted-foreground text-[10px] font-bold uppercase">
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {item.company} {item.serviceName}
                {item.trackingCode ? ` · rastreio ${item.trackingCode}` : ""}
                {item.deliveredAt ? ` · entregue em ${formatDate(item.deliveredAt)}` : ""}
                {refunded ? " · valor devolvido no PIX usado na compra" : ""}
              </span>
              {item.trackingUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={item.trackingUrl} target="_blank" rel="noopener">
                    Rastrear pedido
                  </a>
                </Button>
              )}
            </div>

            <ReturnRequestBox
              item={item}
              onRequested={() =>
                setItems((prev) =>
                  (prev ?? []).map((order) =>
                    order.orderId === item.orderId
                      ? { ...order, returnStatus: "open", canRequestReturn: false }
                      : order
                  )
                )
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
