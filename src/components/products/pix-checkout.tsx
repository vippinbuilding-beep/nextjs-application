"use client";

import { Check, Copy, QrCode } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { formatBRL } from "@/lib/money";

interface PixCheckoutProps {
  productId: string;
  priceCents: number;
  isAuthenticated: boolean;
}

interface CheckoutResponse {
  orderId: string;
  amountCents: number;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string | null;
}

type Phase = "idle" | "creating" | "awaiting" | "paid" | "error";

const POLL_INTERVAL_MS = 4000;

/**
 * Transparent PIX checkout. Opens a charge on our API, shows the QR code and
 * copy-and-paste code, then polls the order status until the payment clears —
 * at which point it refreshes the page so the (now unlocked) product content
 * renders in place.
 */
export function PixCheckout({
  productId,
  priceCents,
  isAuthenticated,
}: PixCheckoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [order, setOrder] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startCheckout = useCallback(async () => {
    setPhase("creating");
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/checkout`, {
        method: "POST",
      });
      const body = (await res.json()) as CheckoutResponse & { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Não foi possível iniciar o pagamento.");
      }
      setOrder(body);
      setPhase("awaiting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar o pagamento.");
      setPhase("error");
    }
  }, [productId]);

  useEffect(() => {
    if (phase !== "awaiting" || !order) return;

    async function poll() {
      try {
        const res = await fetch(`/api/orders/${order!.orderId}/status`);
        if (!res.ok) return;
        const body = (await res.json()) as { status: string; paid: boolean };
        if (body.paid) {
          stopPolling();
          setPhase("paid");
          setTimeout(() => router.refresh(), 1200);
        } else if (body.status === "expired") {
          stopPolling();
          setError("O tempo para pagamento expirou. Tente novamente.");
          setPhase("error");
        }
      } catch {
        // Transient network error; keep polling.
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return stopPolling;
  }, [phase, order, router, stopPolling]);

  const copyCode = useCallback(async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the code is still visible for manual copy.
    }
  }, [order]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted px-6 py-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm">
          <QrCode className="size-6" />
        </span>
        <p className="text-muted-foreground text-sm">
          Entre na sua conta para comprar este conteúdo com PIX.
        </p>
        <Button asChild className="w-full max-w-xs">
          <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
            Entrar para comprar
          </Link>
        </Button>
      </div>
    );
  }

  if (phase === "paid") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-primary px-6 py-8 text-center shadow-cartoon-sm">
        <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm">
          <Check className="size-6" />
        </span>
        <p className="font-bold">Pagamento confirmado!</p>
        <p className="text-sm">Liberando seu acesso...</p>
      </div>
    );
  }

  if (phase === "awaiting" && order) {
    const imgSrc = order.brCodeBase64.startsWith("data:")
      ? order.brCodeBase64
      : `data:image/png;base64,${order.brCodeBase64}`;

    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-border bg-background px-6 py-8 text-center shadow-cartoon-sm">
        <p className="font-bold">Escaneie o QR Code para pagar</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="QR Code PIX"
          className="size-56 rounded-xl border-2 border-border bg-white p-2"
        />
        <div className="flex w-full flex-col gap-2">
          <p className="text-muted-foreground text-xs font-medium">
            Ou copie o código PIX:
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border-2 border-border bg-muted px-3 py-2 text-left text-xs">
              {order.brCode}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyCode}
              aria-label="Copiar código PIX"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loading /> Aguardando confirmação do pagamento...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted px-6 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm">
        <QrCode className="size-6" />
      </span>
      {phase === "error" && error && (
        <p className="text-destructive text-sm font-semibold" role="alert">
          {error}
        </p>
      )}
      <p className="text-muted-foreground text-sm">
        Pague com PIX e tenha acesso imediato ao conteúdo.
      </p>
      <Button
        className="w-full max-w-xs"
        onClick={startCheckout}
        disabled={phase === "creating"}
      >
        {phase === "creating" ? (
          <>
            <Loading /> Gerando PIX...
          </>
        ) : (
          <>
            <QrCode className="size-4" /> Comprar por {formatBRL(priceCents)}
          </>
        )}
      </Button>
    </div>
  );
}
