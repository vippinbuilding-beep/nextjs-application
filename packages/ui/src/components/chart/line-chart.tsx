"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface LineChartSeries<T> {
  /** Chave do valor em cada ponto de `data`. */
  key: keyof T & string;
  label: string;
  /** Cor da linha; por padrão usa os tokens --chart-1..5. */
  color?: string;
}

export interface LineChartProps<T> {
  data: T[];
  xKey: keyof T & string;
  series: LineChartSeries<T>[];
  height?: number;
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
 * Wrapper fino de gráfico de linhas sobre recharts, temado com os tokens do
 * projeto. Client-only (recharts). Passe valores já em unidade de exibição.
 */
export function LineChart<T>({
  data,
  xKey,
  series,
  height = 260,
  formatValue,
  formatX,
}: LineChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
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
        />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            strokeWidth={2.5}
            dot={false}
          />
        ))}
      </RLineChart>
    </ResponsiveContainer>
  );
}
