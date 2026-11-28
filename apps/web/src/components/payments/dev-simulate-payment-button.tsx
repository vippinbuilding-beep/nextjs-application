"use client";

import { FlaskConical } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@vippin/ui/button";
import { Loading } from "@vippin/ui/loading";

interface DevSimulatePaymentButtonProps {
  kind: "order" | "ask_me";
  id: string;
}

/**
 * Dev-only button shown inside the PIX QR modal. Renders nothing unless the
 * server reports AbacatePay Dev mode. After simulating, the regular status
 * poll picks up the payment and moves the checkout forward.
 */
export function DevSimulatePaymentButton({ kind, id }: DevSimulatePaymentButtonProps) {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dev/simulate-payment")
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((body: { enabled?: boolean }) => {
        if (!cancelled) setEnabled(Boolean(body.enabled));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  async function simulate() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/dev/simulate-payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Falha ao simular o pagamento.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao simular o pagamento.");
      setState("idle");
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted p-3">
      <p className="text-muted-foreground text-xs font-medium">
        Ambiente de desenvolvimento
      </p>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => void simulate()}
        disabled={state !== "idle"}
      >
        {state === "loading" ? (
          <>
            <Loading /> Simulando...
          </>
        ) : state === "done" ? (
          "Pagamento simulado, confirmando..."
        ) : (
          <>
            <FlaskConical className="size-4" /> Simular pagamento (dev)
          </>
        )}
      </Button>
      {error && (
        <p className="text-destructive text-xs font-semibold" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
