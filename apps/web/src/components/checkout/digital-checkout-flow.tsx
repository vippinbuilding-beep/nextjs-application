"use client";

import { Check, QrCode, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@vippin/ui/button";
import { Loading } from "@vippin/ui/loading";
import { formatBRL } from "@vippin/core/domain/money";

import { CheckoutDivider, CheckoutStep } from "./checkout-step";
import { CheckoutLogin } from "./checkout-login";
import { PixPaymentPanel } from "./pix-payment-panel";
import { usePixCharge } from "./use-pix-charge";

interface DigitalCheckoutFlowProps {
  productId: string;
  priceCents: number;
  isAuthenticated: boolean;
  /** Product page: after payment the buyer goes there, content unlocked. */
  productHref: string;
}

/** Digital product: Conta → Pagamento (PIX) → back to the unlocked content. */
export function DigitalCheckoutFlow({
  productId,
  priceCents,
  isAuthenticated,
  productHref,
}: DigitalCheckoutFlowProps) {
  const router = useRouter();
  const pix = usePixCharge({
    productId,
    onPaid: () => {
      setTimeout(() => {
        router.push(productHref);
        router.refresh();
      }, 1400);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <CheckoutStep number={1} title="Conta" done={isAuthenticated}>
        {isAuthenticated ? (
          <p className="text-muted-foreground text-sm">
            Você está conectado. O acesso fica salvo na sua conta.
          </p>
        ) : (
          <CheckoutLogin message="Entre para comprar. O acesso fica salvo na sua conta." />
        )}
      </CheckoutStep>

      <CheckoutDivider />

      <CheckoutStep
        number={2}
        title="Pagamento com PIX"
        done={pix.phase === "paid"}
        locked={!isAuthenticated}
      >
        {pix.phase === "paid" ? (
          <PaidMessage
            title="Pagamento confirmado!"
            text="Liberando seu acesso..."
          />
        ) : pix.phase === "awaiting" && pix.order ? (
          <PixPaymentPanel order={pix.order} copied={pix.copied} onCopy={() => void pix.copy()} />
        ) : (
          <div className="flex flex-col gap-3">
            {pix.error && (
              <p className="text-destructive text-sm font-semibold" role="alert">
                {pix.error}
              </p>
            )}
            <Button
              size="lg"
              onClick={() => void pix.start()}
              disabled={pix.phase === "creating"}
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
                  <QrCode className="size-5" /> Pagar {formatBRL(priceCents)} com PIX
                </>
              )}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Acesso imediato depois que o banco confirmar o pagamento.
            </p>
          </div>
        )}
      </CheckoutStep>
    </div>
  );
}

export function PaidMessage({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="bg-success/10 flex animate-pop flex-col items-center gap-3 rounded-3xl px-6 py-8 text-center">
      <span className="bg-success text-background flex size-14 animate-pop items-center justify-center rounded-full">
        <Check className="size-7" strokeWidth={3} />
      </span>
      <p className="text-lg font-bold">{title}</p>
      <p className="text-muted-foreground text-sm">{text}</p>
      {children}
    </div>
  );
}
