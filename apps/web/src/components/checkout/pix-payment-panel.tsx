"use client";

import { Check, Copy } from "lucide-react";

import { DevSimulatePaymentButton } from "@/components/payments/dev-simulate-payment-button";
import { Button } from "@vippin/ui/button";
import { formatBRL } from "@vippin/core/domain/money";
import { cn } from "@vippin/ui/lib/utils";

import type { CheckoutResponse } from "./use-pix-charge";

const TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

interface PixPaymentPanelProps {
  order: CheckoutResponse;
  copied: boolean;
  onCopy: () => void;
}

/**
 * Só o essencial do Pix: valor, QR Code e copia-e-cola. No celular o caminho
 * natural é copiar o código (não dá para escanear a própria tela), então o
 * botão de copiar é a ação principal.
 *
 * Entrada em sequência (CSS, uma vez): o valor surge com mola, o QR se abre
 * num círculo a partir do centro e um brilho passa por cima. Copiar troca o
 * ícone por um check com mola.
 */
export function PixPaymentPanel({ order, copied, onCopy }: PixPaymentPanelProps) {
  const imgSrc = order.brCodeBase64.startsWith("data:")
    ? order.brCodeBase64
    : `data:image/png;base64,${order.brCodeBase64}`;
  const expiresAt = order.expiresAt ? new Date(order.expiresAt) : null;
  const validUntil =
    expiresAt && !Number.isNaN(expiresAt.getTime()) ? TIME_FORMAT.format(expiresAt) : null;

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="animate-in fade-in-0 zoom-in-90 ease-spring flex flex-col gap-1 duration-500">
        <span className="text-3xl font-semibold tracking-tight">{formatBRL(order.amountCents)}</span>
        <span className="text-muted-foreground text-sm">
          {validUntil ? `Pix válido até ${validUntil}` : "Pague com o app do seu banco"}
        </span>
      </div>

      {/* O QR precisa de fundo branco nos dois temas para o banco ler. */}
      <div className="border-aurora relative overflow-hidden rounded-3xl p-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="QR Code Pix"
          width={224}
          height={224}
          className="size-56 rounded-[1.25rem] bg-white p-2 [animation:reveal-circle_720ms_var(--spring-soft)_120ms_both]"
        />
        {/* Brilho que passa uma vez depois da revelação */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-full -skew-x-12 bg-linear-to-r from-transparent via-white/45 to-transparent [animation:shine-sweep_900ms_ease-out_760ms_both]"
        />
      </div>

      <Button
        type="button"
        size="lg"
        className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both w-full max-w-xs delay-300 duration-500 ease-spring-soft"
        onClick={onCopy}
        aria-live="polite"
      >
        <span aria-hidden className="relative size-5">
          <Copy
            className={cn(
              "absolute inset-0 size-5 transition-[transform,opacity] duration-300 ease-spring",
              copied && "scale-50 -rotate-90 opacity-0"
            )}
          />
          <Check
            className={cn(
              "absolute inset-0 size-5 transition-[transform,opacity] duration-[420ms] ease-spring-bouncy",
              !copied && "scale-50 rotate-90 opacity-0"
            )}
            strokeWidth={3}
          />
        </span>
        <span key={copied ? "copied" : "copy"} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          {copied ? "Código copiado" : "Copiar código Pix"}
        </span>
      </Button>

      <p className="text-muted-foreground flex items-center gap-2.5 text-sm">
        <span aria-hidden className="relative flex size-2">
          <span className="bg-ring absolute inset-0 animate-ping rounded-full opacity-60" />
          <span className="bg-ring relative size-2 rounded-full" />
        </span>
        Esperando o banco confirmar
      </p>

      {/* Só aparece no modo dev da AbacatePay. */}
      <DevSimulatePaymentButton kind="order" id={order.orderId} />
    </div>
  );
}
