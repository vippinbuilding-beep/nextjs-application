"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CartoonBarChart,
  CartoonTimelineChart,
} from "@/components/creator/charts/cartoon-charts";
import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { PerformancePeriodPicker } from "@/components/creator/performance-period-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CreatorPerformanceSnapshot } from "@/lib/creator-dashboard/performance";
import {
  buildCreatorPerformanceApiQuery,
  parseCreatorPerformancePeriod,
} from "@/lib/creator-dashboard/performance-period";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-cartoon-sm", className)}>
      <CardContent className="flex flex-col gap-1 pt-6">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {hint && (
          <p className="text-muted-foreground text-xs font-medium">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

function getPeriodDescription(snapshot: CreatorPerformanceSnapshot): string {
  if (snapshot.periodKind === "custom") {
    return `Resumo consolidado de ${snapshot.periodLabel}: vendas, Me pergunte e adesões gratuitas.`;
  }
  return `Resumo consolidado dos ${snapshot.periodLabel}: vendas, Me pergunte e adesões gratuitas.`;
}

export function CreatorPerformancePanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const daysParam = searchParams.get("days");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const period = useMemo(
    () =>
      parseCreatorPerformancePeriod({
        days: daysParam,
        from: fromParam,
        to: toParam,
      }),
    [daysParam, fromParam, toParam]
  );

  const [snapshot, setSnapshot] = useState<CreatorPerformanceSnapshot | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePeriodChange = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/creator/performance?${buildCreatorPerformanceApiQuery(period)}`
      );
      const body = (await res.json()) as CreatorPerformanceSnapshot & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Não foi possível carregar o desempenho.");
      }
      setSnapshot(body);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível carregar o desempenho."
      );
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !snapshot) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="flex flex-col gap-6">
        <CreatorModuleHeader
          title="Desempenho"
          description="Resumo consolidado de vendas, Me pergunte e adesões gratuitas."
        >
          <PerformancePeriodPicker
            period={period}
            onPeriodChange={handlePeriodChange}
            disabled={loading}
          />
        </CreatorModuleHeader>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive text-sm font-medium" role="alert">
              {error ?? "Não foi possível carregar o desempenho."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, earningsByDay, topProducts, askMeByStatus } = snapshot;

  const responseRateLabel =
    summary.askMeResponseRatePercent == null
      ? "—"
      : `${summary.askMeResponseRatePercent}%`;

  return (
    <div
      className={cn(
        "flex flex-col gap-6 transition-opacity",
        loading && "pointer-events-none opacity-60"
      )}
    >
      <CreatorModuleHeader
        title="Desempenho"
        description={getPeriodDescription(snapshot)}
      >
        <div className="flex items-center gap-2">
          {loading && (
            <Loader2
              className="text-muted-foreground size-4 animate-spin"
              aria-hidden
            />
          )}
          <PerformancePeriodPicker
            period={period}
            onPeriodChange={handlePeriodChange}
            disabled={loading}
          />
        </div>
      </CreatorModuleHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sua parte no período"
          value={formatBRL(summary.creatorEarningsCents)}
          hint="Produtos + Me pergunte respondido"
        />
        <KpiCard
          label="Vendas de produtos"
          value={String(summary.productSalesCount)}
          hint="Pedidos pagos"
        />
        <KpiCard
          label="Me pergunte"
          value={String(summary.askMePaidCount)}
          hint={`${summary.askMeAnsweredCount} respondida${summary.askMeAnsweredCount === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="Adesões gratuitas"
          value={String(summary.freeClaimsCount)}
          hint={`Taxa de resposta: ${responseRateLabel}`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Receita por dia</CardTitle>
          <CardDescription>
            Sua parte líquida acumulada por dia no período.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CartoonTimelineChart
            points={earningsByDay.map((point) => ({
              key: point.date,
              label: point.label,
              productCents: point.productCents,
              askMeCents: point.askMeCents,
            }))}
            valueFormatter={formatBRL}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top produtos</CardTitle>
            <CardDescription>Os que mais geraram receita para você.</CardDescription>
          </CardHeader>
          <CardContent>
            <CartoonBarChart
              items={topProducts.map((product) => ({
                key: product.productId,
                label: product.title,
                value: product.earningsCents,
              }))}
              valueFormatter={(value) => formatBRL(value)}
              emptyLabel="Nenhuma venda paga no período."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Me pergunte por status</CardTitle>
            <CardDescription>
              Perguntas pagas recebidas no período selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CartoonBarChart
              items={askMeByStatus.map((item) => ({
                key: item.status,
                label: item.label,
                value: item.count,
                colorClassName:
                  item.status === "answered"
                    ? "bg-chart-4"
                    : item.status === "awaiting_response"
                      ? "bg-primary"
                      : item.status === "declined" || item.status === "expired"
                        ? "bg-chart-3"
                        : "bg-muted",
              }))}
              valueFormatter={(value) => String(value)}
              emptyLabel="Nenhuma pergunta paga no período."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
