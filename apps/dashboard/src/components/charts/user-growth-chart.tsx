"use client";

import { BarChart } from "@vippin/ui/chart/bar-chart";

export interface UserGrowthPoint {
  date: string;
  creators: number;
  consumers: number;
}

function formatDayLabel(iso: string): string {
  const parts = iso.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return iso;
}

export function UserGrowthChart({ data }: { data: UserGrowthPoint[] }) {
  return (
    <BarChart
      data={data}
      xKey="date"
      stacked
      series={[
        { key: "creators", label: "Criadores", color: "var(--chart-1)" },
        { key: "consumers", label: "Consumidores", color: "var(--chart-4)" },
      ]}
      formatValue={(v) => String(Math.round(v))}
      formatX={formatDayLabel}
    />
  );
}
