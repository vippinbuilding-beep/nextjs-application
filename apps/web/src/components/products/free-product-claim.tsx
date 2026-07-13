"use client";

import { Check, Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { LoginRolePicker } from "@/components/auth/login-role-picker";
import { useCurrentReturnPath } from "@/hooks/use-current-return-path";
import { Button } from "@vippin/ui/button";
import { Loading } from "@vippin/ui/loading";

interface FreeProductClaimProps {
  productId: string;
  isAuthenticated: boolean;
}

type Phase = "idle" | "claiming" | "claimed" | "error";

export function FreeProductClaim({
  productId,
  isAuthenticated,
}: FreeProductClaimProps) {
  const router = useRouter();
  const returnPath = useCurrentReturnPath();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const claimAccess = useCallback(async () => {
    setPhase("claiming");
    setError(null);

    try {
      const res = await fetch(`/api/products/${productId}/claim`, {
        method: "POST",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Não foi possível aderir ao conteúdo.");
      }

      setPhase("claimed");
      setTimeout(() => router.refresh(), 800);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível aderir ao conteúdo."
      );
      setPhase("error");
    }
  }, [productId, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted px-6 py-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm">
          <Gift className="size-6" />
        </span>
        <p className="text-muted-foreground text-sm">
          Entre na sua conta para aderir a este conteúdo gratuito.
        </p>
        <LoginRolePicker next={returnPath} className="max-w-xs" />
      </div>
    );
  }

  if (phase === "claimed") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-primary px-6 py-8 text-center shadow-cartoon-sm">
        <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm">
          <Check className="size-6" />
        </span>
        <p className="font-bold">Acesso liberado!</p>
        <p className="text-sm">Abrindo o conteúdo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted px-6 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm">
        <Gift className="size-6" />
      </span>

      {phase === "error" && error && (
        <p className="text-destructive text-sm font-semibold" role="alert">
          {error}
        </p>
      )}

      <p className="text-muted-foreground text-sm">
        Este conteúdo é gratuito. Aderir libera o acesso imediatamente na sua conta.
      </p>

      <Button
        className="w-full max-w-xs"
        onClick={() => void claimAccess()}
        disabled={phase === "claiming"}
      >
        {phase === "claiming" ? (
          <>
            <Loading /> Liberando acesso...
          </>
        ) : (
          <>
            <Gift className="size-4" /> Aderir gratuitamente
          </>
        )}
      </Button>
    </div>
  );
}
