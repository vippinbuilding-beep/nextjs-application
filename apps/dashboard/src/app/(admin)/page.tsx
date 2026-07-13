import { formatBRL } from "@vippin/core/domain/money";
import { adminAnalyticsRepository } from "@vippin/supabase/factories/admin-repository-factory";
import { Card, CardContent, CardHeader, CardTitle } from "@vippin/ui/card";
import { StatCard } from "@vippin/ui/stat-card";

import { RevenueChart } from "@/components/charts/revenue-chart";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { rangeFromSearchParams } from "@/lib/dashboard/range";

export const dynamic = "force-dynamic";

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export default async function VisaoGeralPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range = rangeFromSearchParams(sp);

  const [stats, revenue] = await Promise.all([
    adminAnalyticsRepository.getOverviewStats(range),
    adminAnalyticsRepository.getRevenueByDay(range),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Métricas do período selecionado.
          </p>
        </div>
        <DateRangePicker from={range.from} to={range.to} />
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Usuários" value={stats.totalUsers.toLocaleString("pt-BR")} hint={`${stats.totalCreators} criadores · ${stats.totalConsumers} consumidores`} />
        <StatCard label="Produtos" value={stats.totalProducts.toLocaleString("pt-BR")} />
        <StatCard label="GMV (período)" value={formatBRL(stats.gmvCents)} />
        <StatCard label="Receita plataforma" value={formatBRL(stats.platformRevenueCents)} />
        <StatCard label="Pedidos pagos" value={stats.ordersPaid.toLocaleString("pt-BR")} hint={`${stats.ordersTotal} criados no período`} />
        <StatCard label="Conversão checkout" value={formatPercent(stats.checkoutConversionRate)} hint="pagos / criados" />
        <StatCard label="Ask Me respondidas" value={stats.askMeAnswered.toLocaleString("pt-BR")} />
        <StatCard label="Ask Me aguardando" value={stats.askMeAwaitingResponse.toLocaleString("pt-BR")} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Receita por dia</CardTitle>
        </CardHeader>
        <CardContent>
          {revenue.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm font-medium">
              Sem pagamentos no período.
            </p>
          ) : (
            <RevenueChart data={revenue} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
