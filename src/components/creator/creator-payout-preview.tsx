"use client";

import { formatBRL } from "@/lib/money";
import {
  creatorPayoutFromGross,
  validateGrossCoversSaleFees,
} from "@/lib/payments/split";
import { cn } from "@/lib/utils";

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

  const netCents = creatorPayoutFromGross(grossCents);

  return (
    <p className={cn("text-xs font-medium", className)}>
      Você recebe{" "}
      <span className="font-bold text-foreground">{formatBRL(netCents)}</span>{" "}
      líquido no saque PIX por {unitLabel}.
    </p>
  );
}
