import { cn } from "@vippin/ui/lib/utils";

interface CartoonBarChartItem {
  key: string;
  label: string;
  value: number;
  /** Tailwind color class for the bar fill. */
  colorClassName?: string;
}

interface CartoonBarChartProps {
  items: CartoonBarChartItem[];
  valueFormatter?: (value: number) => string;
  className?: string;
  emptyLabel?: string;
}

export function CartoonBarChart({
  items,
  valueFormatter = (value) => String(value),
  className,
  emptyLabel = "Sem dados no período.",
}: CartoonBarChartProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  if (!items.length || items.every((item) => item.value <= 0)) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">{emptyLabel}</p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => {
        const widthPercent = Math.max(8, Math.round((item.value / maxValue) * 100));

        return (
          <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-center gap-3">
            <span className="truncate text-sm font-bold">{item.label}</span>
            <div className="h-4 rounded-full border-2 border-border bg-muted">
              <div
                className={cn(
                  "h-full rounded-full border-2 border-border shadow-cartoon-sm",
                  item.colorClassName ?? "bg-primary"
                )}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <span className="text-muted-foreground text-xs font-bold tabular-nums">
              {valueFormatter(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface CartoonTimelineChartProps {
  points: Array<{
    key: string;
    label: string;
    productCents: number;
    askMeCents: number;
  }>;
  valueFormatter: (cents: number) => string;
  className?: string;
  emptyLabel?: string;
}

export function CartoonTimelineChart({
  points,
  valueFormatter,
  className,
  emptyLabel = "Sem receita no período.",
}: CartoonTimelineChartProps) {
  const totals = points.map((point) => point.productCents + point.askMeCents);
  const maxTotal = Math.max(...totals, 1);
  const hasData = totals.some((total) => total > 0);

  if (!hasData) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">{emptyLabel}</p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          className="flex min-w-max items-end gap-1.5 sm:gap-2"
          style={{ minHeight: "12rem" }}
        >
          {points.map((point, index) => {
            const total = point.productCents + point.askMeCents;
            const heightPercent = total > 0 ? Math.max(10, (total / maxTotal) * 100) : 0;
            const productShare =
              total > 0 ? Math.round((point.productCents / total) * 100) : 0;
            const labelEvery =
              points.length > 31 ? Math.max(1, Math.ceil(points.length / 12)) : 1;
            const showLabel =
              index % labelEvery === 0 || index === points.length - 1;

            return (
              <div
                key={point.key}
                className="flex w-8 flex-col items-center gap-2 sm:w-9"
                title={`${point.label}: ${valueFormatter(total)}`}
              >
                <div className="flex h-40 w-full items-end">
                  {total > 0 ? (
                    <div
                      className="flex w-full flex-col justify-end overflow-hidden rounded-t-xl border-2 border-border shadow-cartoon-sm"
                      style={{ height: `${heightPercent}%` }}
                    >
                      {point.askMeCents > 0 && (
                        <div
                          className="w-full bg-chart-4"
                          style={{
                            flexGrow: total - point.productCents,
                          }}
                        />
                      )}
                      {point.productCents > 0 && (
                        <div
                          className="w-full bg-primary"
                          style={{
                            flexGrow: point.productCents,
                          }}
                        />
                      )}
                      {point.productCents > 0 && point.askMeCents > 0 && (
                        <span className="sr-only">
                          {productShare}% produtos
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="h-1.5 w-full rounded-full bg-muted" />
                  )}
                </div>
                <span className="text-muted-foreground text-[10px] font-bold">
                  {showLabel ? point.label : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm border-2 border-border bg-primary" />
          Produtos
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm border-2 border-border bg-chart-4" />
          Me pergunte
        </span>
      </div>
    </div>
  );
}
