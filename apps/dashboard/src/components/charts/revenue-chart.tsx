"use client";

import { formatBRL } from "@vippin/core/domain/money";
import { LineChart } from "@vippin/ui/chart/line-chart";

export interface RevenuePoint {
  date: string;
  gmvCents: number;
  platformFeeCents: number;
}

function formatDayLabel(iso: string): string {
  // iso: "YYYY-MM-DD" → "DD/MM"
  const parts = iso.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return iso;
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <LineChart
      data={data}
      xKey="date"
      series={[
        { key: "gmvCents", label: "GMV", color: "var(--chart-2)" },
        { key: "platformFeeCents", label: "Receita plataforma", color: "var(--chart-1)" },
      ]}
      formatValue={(v) => formatBRL(v)}
      formatX={formatDayLabel}
    />
  );
}
