"use client";

import { formatBRL } from "@vippin/core/domain/money";
import {
  getCreatorPayoutBreakdown,
  validateGrossCoversSaleFees,
} from "@/lib/payments/split";
import { cn } from "@vippin/ui/lib/utils";

interface CreatorPayoutPreviewProps {
  grossCents: number;
  /** Shown after "por" — e.g. venda, pergunta */
  unitLabel?: string;
  className?: string;
}

/**
 * Shows the net amount the creator receives on PIX withdraw for one sale/question.
 */
export function CreatorPayoutPreview({
  grossCents,
  unitLabel = "venda",
  className,
}: CreatorPayoutPreviewProps) {
  if (grossCents <= 0) return null;

  const feeError = validateGrossCoversSaleFees(grossCents);
  if (feeError) {
    return (
      <p className={cn("text-destructive text-xs font-medium", className)} role="alert">
        {feeError}
      </p>
    );
  }

  const breakdown = getCreatorPayoutBreakdown(grossCents);

  return (
    <div className={cn("flex flex-col gap-1 text-xs font-medium", className)}>
      <p>
        Você recebe{" "}
        <span className="font-bold text-foreground">
          {formatBRL(breakdown.netWithdrawCents)}
        </span>{" "}
        líquido no PIX por {unitLabel}.
      </p>
    </div>
  );
}
