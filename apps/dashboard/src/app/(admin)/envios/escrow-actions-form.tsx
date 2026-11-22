"use client";

import { useActionState } from "react";

import { Button } from "@vippin/ui/button";
import { Input } from "@vippin/ui/input";

import { runEscrowAction, type EscrowActionState } from "./actions";

interface EscrowActionsFormProps {
  orderId: string;
  canRelease: boolean;
  canHold: boolean;
  canRefund: boolean;
}

/** Liberar / reter / reembolsar / ajuste de frete for one order. */
export function EscrowActionsForm({
  orderId,
  canRelease,
  canHold,
  canRefund,
}: EscrowActionsFormProps) {
  const [state, formAction, pending] = useActionState<EscrowActionState, FormData>(
    runEscrowAction,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <Input name="note" placeholder="Motivo (fica na auditoria)" className="h-8 text-xs" />
      <div className="flex flex-wrap gap-1.5">
        {canRelease && (
          <Button type="submit" name="action" value="release" size="sm" disabled={pending}>
            Liberar
          </Button>
        )}
        {canHold && (
          <Button type="submit" name="action" value="hold" size="sm" variant="outline" disabled={pending}>
            Reter
          </Button>
        )}
        {canRefund && (
          <Button
            type="submit"
            name="action"
            value="refund"
            size="sm"
            variant="outline"
            className="border-destructive text-destructive"
            disabled={pending}
          >
            Reembolsar
          </Button>
        )}
      </div>
      <div className="flex gap-1.5">
        <Input name="amount" placeholder="Ajuste R$ (ex.: 4,90)" className="h-8 text-xs" inputMode="decimal" />
        <Button type="submit" name="action" value="adjust" size="sm" variant="outline" disabled={pending}>
          Cobrar do criador
        </Button>
      </div>
      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
      {state.ok && <p className="text-xs font-medium">Feito.</p>}
    </form>
  );
}
