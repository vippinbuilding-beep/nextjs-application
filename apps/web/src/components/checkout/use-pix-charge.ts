"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Response of `POST /api/products/[id]/checkout` (PIX charge). */
export interface CheckoutResponse {
  orderId: string;
  amountCents: number;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string | null;
}

export type PixChargePhase = "idle" | "creating" | "awaiting" | "paid" | "error";

const POLL_INTERVAL_MS = 4000;

interface UsePixChargeOptions {
  productId: string;
  onPaid?: (order: CheckoutResponse) => void;
}

/**
 * PIX charge of a product: opens it on our API (`/api/products/[id]/checkout`)
 * and polls `/api/orders/[id]/status` until it is paid or expires. The server
 * is the source of truth for the amount; nothing here unlocks anything.
 */
export function usePixCharge({ productId, onPaid }: UsePixChargeOptions) {
  const [phase, setPhase] = useState<PixChargePhase>("idle");
  const [order, setOrder] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPaidRef = useRef(onPaid);

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  /** Opens the charge. `body` is sent as JSON (physical: shipTo + serviceId). */
  const start = useCallback(
    async (body?: unknown): Promise<{ ok: boolean; status: number }> => {
      setPhase("creating");
      setError(null);
      try {
        const res = await fetch(`/api/products/${productId}/checkout`, {
          method: "POST",
          ...(body === undefined
            ? {}
            : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
        });
        const data = (await res.json()) as CheckoutResponse & { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Não foi possível iniciar o pagamento.");
          setPhase("error");
          return { ok: false, status: res.status };
        }
        setOrder(data);
        setPhase("awaiting");
        return { ok: true, status: res.status };
      } catch {
        setError("Erro ao iniciar o pagamento. Confira sua conexão e tente de novo.");
        setPhase("error");
        return { ok: false, status: 0 };
      }
    },
    [productId]
  );

  useEffect(() => {
    if (phase !== "awaiting" || !order) return;
    const current = order;

    async function poll() {
      try {
        const res = await fetch(`/api/orders/${current.orderId}/status`);
        if (!res.ok) return;
        const body = (await res.json()) as { status: string; paid: boolean };
        if (body.paid) {
          stopPolling();
          setPhase("paid");
          onPaidRef.current?.(current);
        } else if (body.status === "expired") {
          stopPolling();
          setError("O tempo para pagamento expirou. Gere um novo PIX.");
          setPhase("error");
          setOrder(null);
        }
      } catch {
        // Transient network error; keep polling.
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return stopPolling;
  }, [phase, order, stopPolling]);

  const copy = useCallback(async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the code is still visible for manual copy.
    }
  }, [order]);

  return { phase, order, error, setError, copied, copy, start };
}
