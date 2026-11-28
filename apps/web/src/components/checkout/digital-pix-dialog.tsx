"use client";

import { QrCode, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@vippin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@vippin/ui/dialog";
import { Loading } from "@vippin/ui/loading";
import { formatBRL } from "@vippin/core/domain/money";

import { CheckoutLogin } from "./checkout-login";
import { PaidMessage } from "./paid-message";
import { PixPaymentPanel } from "./pix-payment-panel";
import { usePixCharge } from "./use-pix-charge";

interface DigitalPixDialogProps {
  productId: string;
  priceCents: number;
  isAuthenticated: boolean;
}

/**
 * Compra de produto digital sem trocar de página: "Comprar" abre o QR Code
 * numa janela (no celular ela sobe de baixo). Pago, a página recarrega no
 * servidor e o conteúdo aparece liberado no lugar.
 */
export function DigitalPixDialog({ productId, priceCents, isAuthenticated }: DigitalPixDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pix = usePixCharge({
    productId,
    onPaid: () => {
      setTimeout(() => router.refresh(), 1200);
    },
  });

  function openDialog() {
    setOpen(true);
    if (isAuthenticated && (pix.phase === "idle" || pix.phase === "error")) void pix.start();
  }

  const awaiting = pix.phase === "awaiting" && pix.order;

  return (
    <>
      <Button size="lg" className="w-full" onClick={openDialog}>
        <QrCode className="size-5" />
        {awaiting ? "Ver QR Code do Pix" : `Comprar por ${formatBRL(priceCents)}`}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-sm:top-auto max-sm:bottom-3 max-sm:translate-y-0">
          <DialogHeader className="items-center text-center">
            <DialogTitle>{isAuthenticated ? "Pague com Pix" : "Entre para comprar"}</DialogTitle>
            {!isAuthenticated && (
              <DialogDescription>O acesso fica salvo na sua conta.</DialogDescription>
            )}
          </DialogHeader>

          {!isAuthenticated ? (
            <CheckoutLogin message="Escolha como quer entrar. Depois é só pagar o Pix." />
          ) : pix.phase === "paid" ? (
            <PaidMessage title="Pagamento confirmado" text="Liberando seu acesso..." />
          ) : awaiting && pix.order ? (
            <PixPaymentPanel order={pix.order} copied={pix.copied} onCopy={() => void pix.copy()} />
          ) : pix.phase === "error" ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="text-destructive text-sm font-semibold" role="alert">
                {pix.error}
              </p>
              <Button onClick={() => void pix.start()}>
                <RotateCcw className="size-4" /> Gerar novo Pix
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
              <Loading /> Gerando o Pix...
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
