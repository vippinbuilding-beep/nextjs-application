"use client";

import * as React from "react";
import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BarChartSeries<T> {
  key: keyof T & string;
  label: string;
  color?: string;
}

export interface BarChartProps<T> {
  data: T[];
  xKey: keyof T & string;
  series: BarChartSeries<T>[];
  height?: number;
  stacked?: boolean;
  formatValue?: (value: number) => string;
  formatX?: (value: string) => string;
}

const DEFAULT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/**
 * Wrapper fino de gráfico de barras sobre recharts, temado com os tokens do
 * projeto. Client-only (recharts).
 */
export function BarChart<T>({
  data,
  xKey,
  series,
  height = 260,
  stacked = false,
  formatValue,
  formatX,
}: BarChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
        <CartesianGrid stroke="var(--border)" strokeOpacity={0.15} vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={formatX}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
        />
        <YAxis
          tickFormatter={formatValue ? (v) => formatValue(Number(v)) : undefined}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          width={56}
        />
        <Tooltip
          formatter={
            formatValue
              ? (value: number | string) => formatValue(Number(value))
              : undefined
          }
          contentStyle={{
            background: "var(--card)",
            border: "2px solid var(--border)",
            borderRadius: 12,
            color: "var(--card-foreground)",
            fontSize: 12,
          }}
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            stroke="var(--border)"
            strokeWidth={2}
            radius={[6, 6, 0, 0]}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </RBarChart>
    </ResponsiveContainer>
  );
}
