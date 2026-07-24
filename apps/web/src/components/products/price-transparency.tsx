"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { formatBRL } from "@vippin/core/domain/money";
import { getCreatorPayoutBreakdown } from "@/lib/payments/split";
import { cn } from "@vippin/ui/lib/utils";

interface PriceTransparencyProps {
  priceCents: number;
  className?: string;
}

/**
 * Shows what the creator actually receives from each sale. Expandable
 * for details, but the headline is simple: "creator gets X" (the real amount).
 */
export function PriceTransparency({ priceCents, className }: PriceTransparencyProps) {
  const [expanded, setExpanded] = useState(false);
  const breakdown = getCreatorPayoutBreakdown(priceCents);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors",
          "hover:bg-muted/30 hover:border-border/80"
        )}
      >
        <span>
          O criador recebe{" "}
          <span className="font-bold text-foreground">{formatBRL(breakdown.accruedCents)}</span>
        </span>
        <ChevronDown
          className={cn("size-4 transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Valor da venda:</span>
            <span className="text-foreground font-bold">{formatBRL(priceCents)}</span>
          </div>
          <div className="h-px bg-border/30" />
          <div className="flex items-center justify-between">
            <span>Taxa de processamento:</span>
            <span className="text-foreground">−{formatBRL(breakdown.salePixFeeCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Taxa de plataforma:</span>
            <span className="text-foreground">−{formatBRL(breakdown.platformPercentFeeCents)}</span>
          </div>
          <div className="h-px bg-border/30" />
          <div className="flex items-center justify-between">
            <span>Criador acumula:</span>
            <span className="text-foreground font-bold">{formatBRL(breakdown.accruedCents)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 leading-tight pt-1">
            Quando ele faz saque, deduz R$ 0,80 de taxa PIX.
          </p>
        </div>
      )}
    </div>
  );
}
