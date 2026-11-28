"use client";

import { Check, Copy } from "lucide-react";

import { Button } from "@vippin/ui/button";
import { Loading } from "@vippin/ui/loading";
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
 * QR code + copia-e-cola, na própria página do checkout. No celular o caminho
 * natural é copiar o código (não dá para escanear a própria tela), então o
 * botão de copiar é a ação principal.
 */
export function PixPaymentPanel({ order, copied, onCopy }: PixPaymentPanelProps) {
  const imgSrc = order.brCodeBase64.startsWith("data:")
    ? order.brCodeBase64
    : `data:image/png;base64,${order.brCodeBase64}`;
  const expiresAt = order.expiresAt ? new Date(order.expiresAt) : null;

  return (
    <div className="flex animate-pop flex-col gap-5">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-muted-foreground text-sm">Valor do PIX</span>
        <span className="text-3xl font-extrabold tracking-tight">{formatBRL(order.amountCents)}</span>
        {expiresAt && !Number.isNaN(expiresAt.getTime()) && (
          <span className="text-muted-foreground text-xs">
            Válido até {TIME_FORMAT.format(expiresAt)}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* O QR precisa de fundo branco nos dois temas para o banco ler. */}
        <div className="border-spectrum shrink-0 rounded-3xl p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt="QR Code PIX"
            width={208}
            height={208}
            className="size-52 rounded-[1.25rem] bg-white p-2"
          />
        </div>

        <ol className="flex flex-col gap-3 text-sm">
          {[
            "Abra o app do seu banco e entre na área Pix.",
            "Escolha ler QR Code ou Pix copia e cola.",
            "Confirme o pagamento. A liberação é automática.",
          ].map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="bg-secondary text-secondary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" size="lg" onClick={onCopy} aria-live="polite">
          {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
          {copied ? "Código copiado!" : "Copiar código PIX"}
        </Button>
        <code className="bg-muted text-muted-foreground max-h-16 overflow-hidden break-all rounded-xl px-3 py-2 text-[11px] leading-snug">
          {order.brCode}
        </code>
      </div>

      <p className="bg-muted flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium">
        <Loading /> Aguardando a confirmação do banco...
      </p>
    </div>
  );
}
