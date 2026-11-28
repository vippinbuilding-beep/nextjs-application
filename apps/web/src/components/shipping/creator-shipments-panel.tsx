"use client";

import { MapPin, Printer, RefreshCw, Truck, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PrepareShipmentDialog,
  type PrepareTarget,
} from "@/components/shipping/prepare-shipment-dialog";
import {
  fetchShipFromStatus,
  PfLimitNotice,
  type ShipFromStatus,
} from "@/components/shipping/ship-from-form";
import { Button } from "@vippin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { Loading } from "@vippin/ui/loading";
import { formatBRL } from "@vippin/core/domain/money";
import type { FulfillmentStatus } from "@vippin/core/models/order";
import type {
  ShipFromAddress,
  ShippingAddress,
  ShippingPackage,
} from "@vippin/core/models/shipping";
import { toast } from "@/lib/toast";
import { cn } from "@vippin/ui/lib/utils";

export interface ShipmentItem {
  orderId: string;
  shipmentId: string | null;
  productTitle: string;
  fulfillmentStatus: FulfillmentStatus;
  statusLabel: string;
  amountCents: number;
  creatorAmountCents: number;
  shippingMode: "buyer_pays" | "free" | null;
  shippingChargedCents: number;
  shippingAbsorbedCents: number;
  serviceName: string | null;
  company: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  paidAt: string | null;
  prepareDeadlineAt: string | null;
  postDeadlineAt: string | null;
  error: string | null;
  canPrepare: boolean;
  canPrint: boolean;
  canCancelLabel: boolean;
  shipTo?: ShippingAddress;
  package?: ShippingPackage;
}

type Filter = "prepare" | "post" | "transit" | "done" | "refunded";

const FILTERS: { id: Filter; label: string; statuses: FulfillmentStatus[] }[] = [
  { id: "prepare", label: "A preparar", statuses: ["awaiting_shipment"] },
  { id: "post", label: "Para postar", statuses: ["label_ready"] },
  { id: "transit", label: "Em trânsito", statuses: ["posted", "in_transit"] },
  { id: "done", label: "Entregues", statuses: ["delivered", "released"] },
  { id: "refunded", label: "Reembolsados", statuses: ["refund_pending", "refunded"] },
];

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

/** Creator "Envios": physical sales, label preparation and printing. */
export function CreatorShipmentsPanel() {
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("prepare");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<PrepareTarget | null>(null);
  const [sellerStatus, setSellerStatus] = useState<ShipFromStatus | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/shipments", { cache: "no-store" });
      const body = (await res.json()) as { items?: ShipmentItem[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Não foi possível carregar os envios.");
      setItems(body.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os envios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    fetchShipFromStatus()
      .then(setSellerStatus)
      .catch(() => undefined);
  }, [load]);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { prepare: 0, post: 0, transit: 0, done: 0, refunded: 0 };
    for (const item of items) {
      const match = FILTERS.find((f) => f.statuses.includes(item.fulfillmentStatus));
      if (match) result[match.id] += 1;
    }
    return result;
  }, [items]);

  const visible = items.filter((item) =>
    FILTERS.find((f) => f.id === filter)!.statuses.includes(item.fulfillmentStatus)
  );

  function toggle(shipmentId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(shipmentId)) next.delete(shipmentId);
      else next.add(shipmentId);
      return next;
    });
  }

  async function printBatch() {
    const ids = [...selected];
    if (!ids.length) return;
    setBusyId("batch");
    try {
      const res = await fetch("/api/shipments/labels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error ?? "Não foi possível gerar o PDF.");
      window.open(body.url, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o PDF.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancelLabel(item: ShipmentItem) {
    if (!item.shipmentId) return;
    setBusyId(item.shipmentId);
    try {
      const res = await fetch(`/api/shipments/${item.shipmentId}/cancel`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Não foi possível cancelar a etiqueta.");
      toast.success("Etiqueta cancelada. Você pode preparar o envio de novo.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cancelar a etiqueta.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="size-5" />
              Pedidos para enviar
            </CardTitle>
            <CardDescription>
              Prepare o envio, imprima a etiqueta e poste em uma agência. O valor
              da venda é liberado quando o rastreio confirmar a entrega.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            aria-label="Atualizar"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PfLimitNotice pfLimit={sellerStatus?.pfLimit ?? null} />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFilter(f.id);
                setSelected(new Set());
              }}
              className={cn(
                "rounded-full border border-border px-3 py-1 text-xs font-semibold cursor-pointer",
                filter === f.id ? "bg-secondary text-secondary-foreground" : "bg-background"
              )}
            >
              {f.label}
              {counts[f.id] > 0 && ` (${counts[f.id]})`}
            </button>
          ))}
        </div>

        {filter === "post" && visible.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void printBatch()}
            disabled={!selected.size || busyId === "batch"}
          >
            {busyId === "batch" ? <Loading /> : <Printer className="size-4" />}
            Imprimir selecionadas ({selected.size})
          </Button>
        )}

        {loading ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loading /> Carregando envios...
          </p>
        ) : error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nenhum pedido nesta etapa.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((item) => (
              <li
                key={item.orderId}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-elevated-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    {item.canPrint && item.shipmentId && (
                      <input
                        type="checkbox"
                        checked={selected.has(item.shipmentId)}
                        onChange={() => toggle(item.shipmentId!)}
                        className="mt-1 size-4"
                        aria-label="Selecionar etiqueta"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold">{item.productTitle}</p>
                      {item.shipTo && (
                        <p className="text-muted-foreground text-xs font-medium">
                          Para {item.shipTo.name} · {item.shipTo.city}/{item.shipTo.state}
                        </p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {item.company} {item.serviceName}
                        {item.shippingMode === "free" ? " · frete grátis" : ""}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-semibold">
                    {item.statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Você recebe <strong className="text-foreground">{formatBRL(item.creatorAmountCents)}</strong>
                    {item.shippingAbsorbedCents > 0 &&
                      ` (frete de ${formatBRL(item.shippingAbsorbedCents)} descontado)`}
                  </span>
                  <span className="text-muted-foreground text-right">
                    {item.fulfillmentStatus === "awaiting_shipment" && item.prepareDeadlineAt
                      ? `Preparar até ${formatDate(item.prepareDeadlineAt)}`
                      : item.fulfillmentStatus === "label_ready" && item.postDeadlineAt
                        ? `Postar até ${formatDate(item.postDeadlineAt)}`
                        : item.trackingCode
                          ? `Rastreio ${item.trackingCode}`
                          : null}
                  </span>
                </div>

                {item.error && item.fulfillmentStatus === "awaiting_shipment" && (
                  <p className="text-destructive text-xs" role="alert">
                    Última tentativa falhou: {item.error}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {item.canPrepare && item.shipmentId && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        setTarget({
                          shipmentId: item.shipmentId!,
                          productTitle: item.productTitle,
                          package: item.package,
                        })
                      }
                    >
                      Preparar envio
                    </Button>
                  )}
                  {item.canPrint && item.shipmentId && (
                    <Button type="button" size="sm" asChild>
                      <a href={`/api/shipments/${item.shipmentId}/label`} target="_blank" rel="noopener">
                        <Printer className="size-4" /> Imprimir etiqueta
                      </a>
                    </Button>
                  )}
                  {item.fulfillmentStatus === "label_ready" && sellerStatus?.shipFrom && (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a
                        href={postingPlacesUrl(sellerStatus.shipFrom, item.company)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="size-4" /> Onde postar
                      </a>
                    </Button>
                  )}
                  {item.canCancelLabel && item.shipmentId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void cancelLabel(item)}
                      disabled={busyId === item.shipmentId}
                    >
                      <XCircle className="size-4" /> Cancelar etiqueta
                    </Button>
                  )}
                  {item.trackingUrl && (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={item.trackingUrl} target="_blank" rel="noopener">
                        Rastrear
                      </a>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <PrepareShipmentDialog
        target={target}
        allowedDocumentTypes={sellerStatus?.allowedDocumentTypes ?? []}
        sender={
          sellerStatus?.shipFrom
            ? { document: sellerStatus.shipFrom.document, state: sellerStatus.shipFrom.state }
            : null
        }
        onClose={() => setTarget(null)}
        onPrepared={() => {
          setTarget(null);
          toast.success("Etiqueta gerada! Imprima e poste o pacote.");
          setFilter("post");
          void load();
        }}
      />
    </Card>
  );
}

/**
 * Google Maps search for posting points of the label's carrier near the
 * creator's ship-from CEP. The Melhor Envio agencies API only filters by
 * city/state (no CEP or distance), so a maps search gives a better "near me".
 */
function postingPlacesUrl(shipFrom: ShipFromAddress, company: string | null): string {
  const carrier =
    !company || /correios/i.test(company) ? "Agência dos Correios" : `Ponto de postagem ${company}`;
  const cep = shipFrom.postalCode.replace(/\D/g, "");
  const where = cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : `${shipFrom.city} ${shipFrom.state}`;
  const query = `${carrier} perto de ${where}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
