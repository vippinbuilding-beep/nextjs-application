"use client";

import { Check, PackageCheck, QrCode, Truck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { LoginRolePicker } from "@/components/auth/login-role-picker";
import {
  PixQrPanel,
  type CheckoutResponse,
} from "@/components/products/pix-checkout";
import {
  AddressFields,
  EMPTY_ADDRESS,
  toAddressPayload,
  validateAddressForm,
  type AddressFormValue,
} from "@/components/shipping/address-fields";
import { useCurrentReturnPath } from "@/hooks/use-current-return-path";
import { Button } from "@vippin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@vippin/ui/dialog";
import { Loading } from "@vippin/ui/loading";
import { onlyDigits } from "@vippin/core/domain/br-documents";
import { formatBRL } from "@vippin/core/domain/money";
import type { ShippingMode } from "@vippin/core/models/product";
import { cn } from "@vippin/ui/lib/utils";

interface ShippingOption {
  serviceId: number;
  serviceName: string;
  company: string;
  priceCents: number;
  buyerPriceCents: number;
  deliveryDays: number;
}

interface QuoteResponse {
  mode: ShippingMode;
  options: ShippingOption[];
  unavailableReason?: string;
  error?: string;
}

interface PhysicalCheckoutProps {
  productId: string;
  priceCents: number;
  shippingMode: ShippingMode;
  inStock: boolean;
  /** False when the seller can't receive new orders now (e.g. PF monthly limit). */
  available?: boolean;
  isAuthenticated: boolean;
}

type Phase = "form" | "creating" | "awaiting" | "paid";

const POLL_INTERVAL_MS = 4000;
const ADDRESS_STORAGE_KEY = "vippin:last-ship-to";

function loadSavedAddress(): AddressFormValue {
  try {
    const raw = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
    return raw ? { ...EMPTY_ADDRESS, ...(JSON.parse(raw) as Partial<AddressFormValue>) } : EMPTY_ADDRESS;
  } catch {
    return EMPTY_ADDRESS;
  }
}

function saveAddress(value: AddressFormValue) {
  try {
    window.localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode); the form just won't be prefilled.
  }
}

/**
 * Checkout of a physical product: delivery address → freight quote (by CEP)
 * → PIX for product + freight (or product only when shipping is free). The
 * server re-quotes before charging; the amount here is indicative.
 */
export function PhysicalCheckout({
  productId,
  priceCents,
  shippingMode,
  inStock,
  available = true,
  isAuthenticated,
}: PhysicalCheckoutProps) {
  const returnPath = useCurrentReturnPath();
  const [address, setAddress] = useState<AddressFormValue>(EMPTY_ADDRESS);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quotedCep, setQuotedCep] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [order, setOrder] = useState<CheckoutResponse | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestQuote = useCallback(
    async (postalCode: string) => {
      setQuoting(true);
      setError(null);
      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, postalCode }),
        });
        const body = (await res.json()) as QuoteResponse;
        if (!res.ok) throw new Error(body.error ?? "Não foi possível calcular o frete.");
        setQuote(body);
        setQuotedCep(postalCode);
        setServiceId(body.options[0]?.serviceId ?? null);
      } catch (err) {
        setQuote(null);
        setServiceId(null);
        setError(err instanceof Error ? err.message : "Não foi possível calcular o frete.");
      } finally {
        setQuoting(false);
      }
    },
    [productId]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const saved = loadSavedAddress();
    setAddress(saved);
    const cep = onlyDigits(saved.postalCode);
    if (cep.length === 8) void requestQuote(cep);
  }, [isAuthenticated, requestQuote]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    if (phase !== "awaiting" || !order) return;
    async function poll() {
      try {
        const res = await fetch(`/api/orders/${order!.orderId}/status`);
        if (!res.ok) return;
        const body = (await res.json()) as { status: string; paid: boolean };
        if (body.paid) {
          stopPolling();
          setQrOpen(false);
          setPhase("paid");
        } else if (body.status === "expired") {
          stopPolling();
          setQrOpen(false);
          setError("O tempo para pagamento expirou. Tente novamente.");
          setPhase("form");
        }
      } catch {
        // Transient network error; keep polling.
      }
    }
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return stopPolling;
  }, [phase, order, stopPolling]);

  const selected = quote?.options.find((o) => o.serviceId === serviceId) ?? null;
  const totalCents = priceCents + (selected?.buyerPriceCents ?? 0);

  async function startCheckout() {
    const validation = validateAddressForm(address);
    if (validation) {
      setError(validation);
      return;
    }
    const cep = onlyDigits(address.postalCode);
    if (!selected || quotedCep !== cep) {
      setError("Calcule o frete para o CEP informado e escolha uma opção.");
      return;
    }
    setError(null);
    setPhase("creating");
    saveAddress(address);
    try {
      const res = await fetch(`/api/products/${productId}/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shipTo: toAddressPayload(address), serviceId: selected.serviceId }),
      });
      const body = (await res.json()) as CheckoutResponse & { error?: string };
      if (!res.ok) {
        if (res.status === 409) void requestQuote(cep);
        throw new Error(body.error ?? "Não foi possível iniciar o pagamento.");
      }
      setOrder(body);
      setPhase("awaiting");
      setQrOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar o pagamento.");
      setPhase("form");
    }
  }

  async function copyCode() {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the code is still visible for manual copy.
    }
  }

  if (inStock && !available) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted px-4 py-6 text-center">
        <PackageCheck className="size-6" />
        <p className="font-bold">Indisponível no momento</p>
        <p className="text-muted-foreground text-sm">
          Este produto não está aceitando novos pedidos agora. Tente novamente mais tarde.
        </p>
      </div>
    );
  }

  if (!inStock) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted px-4 py-6 text-center">
        <PackageCheck className="size-6" />
        <p className="font-bold">Esgotado</p>
        <p className="text-muted-foreground text-sm">
          Este produto está sem estoque no momento.
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted px-4 py-6 text-center sm:px-6 sm:py-8">
        <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm">
          <Truck className="size-6" />
        </span>
        <p className="text-muted-foreground text-sm">
          Entre para calcular o frete e comprar com PIX.
        </p>
        <LoginRolePicker next={returnPath} />
      </div>
    );
  }

  if (phase === "paid") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-primary px-6 py-8 text-center shadow-cartoon-sm">
        <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm">
          <Check className="size-6" />
        </span>
        <p className="font-bold">Pedido confirmado!</p>
        <p className="text-sm">
          Você recebe o código de rastreio assim que o envio for preparado.
        </p>
        <Button asChild variant="outline" className="w-full max-w-xs bg-background">
          <Link href="/my-orders">Acompanhar pedido</Link>
        </Button>
      </div>
    );
  }

  const busy = phase === "creating" || quoting;

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Truck className="size-4" />
          {shippingMode === "free" ? "Frete grátis — informe o endereço" : "Entrega"}
        </div>

        <AddressFields
          idPrefix="ship-to"
          value={address}
          onChange={(next) => {
            setAddress(next);
            if (onlyDigits(next.postalCode) !== quotedCep) {
              setQuote(null);
              setServiceId(null);
            }
          }}
          onPostalCodeResolved={(cep) => void requestQuote(cep)}
          disabled={busy || phase === "awaiting"}
          nameLabel="Nome do destinatário"
        />

        {quoting && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loading /> Calculando frete...
          </p>
        )}

        {quote?.unavailableReason && (
          <p className="text-destructive text-sm font-semibold" role="alert">
            {quote.unavailableReason}
          </p>
        )}

        {quote && quote.options.length > 0 && (
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Opções de frete">
            {quote.options.map((option) => {
              const isSelected = option.serviceId === serviceId;
              return (
                <button
                  key={option.serviceId}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setServiceId(option.serviceId)}
                  disabled={busy || phase === "awaiting"}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border-2 border-border px-3 py-2.5 text-left text-sm transition-all cursor-pointer",
                    isSelected ? "bg-primary shadow-cartoon-sm" : "bg-background hover:shadow-cartoon-sm"
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-bold">
                      {option.company} · {option.serviceName}
                    </span>
                    <span className="text-muted-foreground text-xs font-medium">
                      {option.deliveryDays > 0
                        ? `até ${option.deliveryDays} dias úteis após a postagem`
                        : "prazo informado na postagem"}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold">
                    {option.buyerPriceCents === 0 ? "Grátis" : formatBRL(option.buyerPriceCents)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="flex flex-col gap-1 rounded-xl border-2 border-border bg-muted/40 px-3 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produto</span>
              <span>{formatBRL(priceCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{selected.buyerPriceCents === 0 ? "Grátis" : formatBRL(selected.buyerPriceCents)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t-2 border-border pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatBRL(totalCents)}</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm font-semibold" role="alert">
            {error}
          </p>
        )}

        {phase === "awaiting" && order ? (
          <Button type="button" onClick={() => setQrOpen(true)}>
            <QrCode className="size-4" /> Ver QR Code para pagar
          </Button>
        ) : (
          <Button type="button" onClick={() => void startCheckout()} disabled={busy || !selected}>
            {phase === "creating" ? (
              <>
                <Loading /> Gerando PIX...
              </>
            ) : (
              <>
                <QrCode className="size-4" />
                {selected ? `Pagar ${formatBRL(totalCents)} com PIX` : "Calcule o frete para continuar"}
              </>
            )}
          </Button>
        )}

        <p className="text-muted-foreground text-xs">
          Seu pagamento fica protegido: o criador só recebe depois que o
          rastreio confirma a entrega. Se o pedido não for enviado no prazo,
          você é reembolsado automaticamente.
        </p>
      </div>

      <Dialog open={qrOpen && phase === "awaiting" && Boolean(order)} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col gap-4">
            <DialogHeader className="items-center text-center sm:text-center">
              <DialogTitle>Escaneie o QR Code para pagar</DialogTitle>
              {order && <DialogDescription>Valor: {formatBRL(order.amountCents)}</DialogDescription>}
            </DialogHeader>
            {order && <PixQrPanel order={order} copied={copied} onCopy={() => void copyCode()} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
