import * as React from "react";

import { cn } from "../lib/utils";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Texto auxiliar abaixo do valor (ex.: comparação, detalhe). */
  hint?: React.ReactNode;
  /** Ícone opcional exibido no canto (ex.: um ícone do lucide-react). */
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Card de KPI no estilo "cartoon" do projeto. Puramente apresentacional
 * (server-safe): recebe valores já formatados na borda da UI.
 */
export function StatCard({ label, value, hint, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-1 rounded-2xl border-2 border-border p-4 shadow-cartoon",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {hint ? (
        <span className="text-muted-foreground text-xs font-medium">{hint}</span>
      ) : null}
    </div>
  );
}
