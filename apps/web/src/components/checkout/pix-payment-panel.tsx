"use client";

import { Check, Copy } from "lucide-react";

import { DevSimulatePaymentButton } from "@/components/payments/dev-simulate-payment-button";
import { Button } from "@vippin/ui/button";
import { formatBRL } from "@vippin/core/domain/money";

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
 */
export function PixPaymentPanel({ order, copied, onCopy }: PixPaymentPanelProps) {
  const imgSrc = order.brCodeBase64.startsWith("data:")
    ? order.brCodeBase64
    : `data:image/png;base64,${order.brCodeBase64}`;
  const expiresAt = order.expiresAt ? new Date(order.expiresAt) : null;
  const validUntil =
    expiresAt && !Number.isNaN(expiresAt.getTime()) ? TIME_FORMAT.format(expiresAt) : null;

  return (
    <div className="flex animate-pop flex-col items-center gap-5 text-center">
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-semibold tracking-tight">{formatBRL(order.amountCents)}</span>
        <span className="text-muted-foreground text-sm">
          {validUntil ? `Pix válido até ${validUntil}` : "Pague com o app do seu banco"}
        </span>
      </div>

      {/* O QR precisa de fundo branco nos dois temas para o banco ler. */}
      <div className="border-aurora rounded-3xl p-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="QR Code Pix"
          width={224}
          height={224}
          className="size-56 rounded-[1.25rem] bg-white p-2"
        />
      </div>

      <Button type="button" size="lg" className="w-full max-w-xs" onClick={onCopy} aria-live="polite">
        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
        {copied ? "Código copiado" : "Copiar código Pix"}
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
