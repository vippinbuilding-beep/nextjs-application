"use client";

import { QrCode, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  AddressFields,
  EMPTY_ADDRESS,
  toAddressPayload,
  validateAddressForm,
  type AddressFormValue,
} from "@/components/shipping/address-fields";
import { Button } from "@vippin/ui/button";
import { Loading } from "@vippin/ui/loading";
import { onlyDigits } from "@vippin/core/domain/br-documents";
import { formatBRL } from "@vippin/core/domain/money";
import type { ShippingMode } from "@vippin/core/models/product";
import { cn } from "@vippin/ui/lib/utils";

import { CheckoutDivider, CheckoutStep } from "./checkout-step";
import { CheckoutLogin } from "./checkout-login";
import { PaidMessage } from "./digital-checkout-flow";
import { PixPaymentPanel } from "./pix-payment-panel";
import { usePixCharge } from "./use-pix-charge";

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

interface PhysicalCheckoutFlowProps {
  productId: string;
  priceCents: number;
  shippingMode: ShippingMode;
  isAuthenticated: boolean;
}

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
 * Physical product: Conta → Entrega → Frete → Pagamento (PIX do produto +
 * frete, ou só do produto com frete grátis). The server re-quotes before
 * charging; the total here is indicative.
 */
export function PhysicalCheckoutFlow({
  productId,
  priceCents,
  shippingMode,
  isAuthenticated,
}: PhysicalCheckoutFlowProps) {
  const [address, setAddress] = useState<AddressFormValue>(EMPTY_ADDRESS);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quotedCep, setQuotedCep] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const pix = usePixCharge({ productId });

  const requestQuote = useCallback(
    async (postalCode: string) => {
      setQuoting(true);
      setQuoteError(null);
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
        setQuoteError(err instanceof Error ? err.message : "Não foi possível calcular o frete.");
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

  const selected = quote?.options.find((o) => o.serviceId === serviceId) ?? null;
  const totalCents = priceCents + (selected?.buyerPriceCents ?? 0);
  const charging = pix.phase === "creating" || pix.phase === "awaiting";
  const locked = charging || pix.phase === "paid";
  const addressReady = quotedCep !== null && quotedCep === onlyDigits(address.postalCode);

  async function startCheckout() {
    const validation = validateAddressForm(address);
    if (validation) {
      pix.setError(validation);
      return;
    }
    const cep = onlyDigits(address.postalCode);
    if (!selected || quotedCep !== cep) {
      pix.setError("Calcule o frete para o CEP informado e escolha uma opção.");
      return;
    }
    saveAddress(address);
    const result = await pix.start({ shipTo: toAddressPayload(address), serviceId: selected.serviceId });
    // 409: the freight changed since the quote. Re-quote so the buyer sees it.
    if (!result.ok && result.status === 409) void requestQuote(cep);
  }

  if (pix.phase === "paid") {
    return (
      <PaidMessage
        title="Pedido confirmado!"
        text="Você recebe o código de rastreio assim que o envio for preparado."
      >
        <Button asChild variant="outline" className="mt-1">
          <Link href="/my-orders">Acompanhar pedido</Link>
        </Button>
      </PaidMessage>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CheckoutStep number={1} title="Conta" done={isAuthenticated}>
        {isAuthenticated ? (
          <p className="text-muted-foreground text-sm">
            Você está conectado. O pedido fica em Meus pedidos.
          </p>
        ) : (
          <CheckoutLogin message="Entre para calcular o frete e comprar com PIX." />
        )}
      </CheckoutStep>

      <CheckoutDivider />

      <CheckoutStep
        number={2}
        title={shippingMode === "free" ? "Entrega (frete grátis)" : "Entrega"}
        done={addressReady}
        locked={!isAuthenticated}
      >
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
          disabled={quoting || locked}
          nameLabel="Nome do destinatário"
        />
      </CheckoutStep>

      <CheckoutDivider />

      <CheckoutStep number={3} title="Frete" done={Boolean(selected)} locked={!isAuthenticated}>
        <div className="flex flex-col gap-2">
          {quoting && (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loading /> Calculando frete...
            </p>
          )}
          {!quoting && !quote && !quoteError && (
            <p className="text-muted-foreground text-sm">Informe o CEP para ver as opções.</p>
          )}
          {quoteError && (
            <p className="text-destructive text-sm font-semibold" role="alert">
              {quoteError}
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
                    disabled={locked}
                    className={cn(
                      "interactive-press flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm",
                      isSelected
                        ? "border-spectrum shadow-elevated-sm"
                        : "border border-border bg-card hover:bg-accent"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                          isSelected ? "border-foreground" : "border-input"
                        )}
                      >
                        {isSelected && <span className="bg-foreground size-2 rounded-full" />}
                      </span>
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
                    </span>
                    <span className="shrink-0 font-bold">
                      {option.buyerPriceCents === 0 ? "Grátis" : formatBRL(option.buyerPriceCents)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </CheckoutStep>

      <CheckoutDivider />

      <CheckoutStep number={4} title="Pagamento com PIX" locked={!isAuthenticated || !selected}>
        {pix.phase === "awaiting" && pix.order ? (
          <PixPaymentPanel order={pix.order} copied={pix.copied} onCopy={() => void pix.copy()} />
        ) : (
          <div className="flex flex-col gap-4">
            {selected && (
              <dl className="bg-muted flex flex-col gap-1.5 rounded-2xl px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Produto</dt>
                  <dd>{formatBRL(priceCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Frete</dt>
                  <dd>{selected.buyerPriceCents === 0 ? "Grátis" : formatBRL(selected.buyerPriceCents)}</dd>
                </div>
                <div className="border-border mt-1 flex justify-between border-t pt-2 text-base font-bold">
                  <dt>Total</dt>
                  <dd>{formatBRL(totalCents)}</dd>
                </div>
              </dl>
            )}
            {pix.error && (
              <p className="text-destructive text-sm font-semibold" role="alert">
                {pix.error}
              </p>
            )}
            <Button
              size="lg"
              onClick={() => void startCheckout()}
              disabled={pix.phase === "creating" || quoting || !selected}
            >
              {pix.phase === "creating" ? (
                <>
                  <Loading /> Gerando PIX...
                </>
              ) : pix.phase === "error" ? (
                <>
                  <RotateCcw className="size-5" /> Gerar novo PIX
                </>
              ) : (
                <>
                  <QrCode className="size-5" /> Pagar {formatBRL(totalCents)} com PIX
                </>
              )}
            </Button>
          </div>
        )}
      </CheckoutStep>

      <p className="text-muted-foreground flex items-start gap-2 text-xs">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        Seu pagamento fica protegido: o criador só recebe depois que o rastreio
        confirma a entrega. Se o pedido não for enviado no prazo, você é
        reembolsado automaticamente.
      </p>
    </div>
  );
}
