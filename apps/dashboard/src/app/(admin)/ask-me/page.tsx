import { formatBRL } from "@vippin/core/domain/money";
import type { AskMeQuestion } from "@vippin/core/models/ask-me-question";
import {
  adminAnalyticsRepository,
  adminAskMeQuestionRepository,
} from "@vippin/supabase/factories/admin-repository-factory";
import { Card, CardContent, CardHeader, CardTitle } from "@vippin/ui/card";
import { DataTable } from "@vippin/ui/data-table";
import { StatCard } from "@vippin/ui/stat-card";

export const dynamic = "force-dynamic";

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(seconds / 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} dias`;
}

export default async function AskMePage() {
  const [overview, pendingRepasses, failedRefunds] = await Promise.all([
    adminAnalyticsRepository.getAskMeOverview(),
    adminAskMeQuestionRepository.listPendingCreatorRepasses(100),
    adminAskMeQuestionRepository.listFailedRefunds(100, 0),
  ]);

  const resolved = overview.answered + overview.declined + overview.expired;
  const responseRate = resolved > 0 ? overview.answered / resolved : 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ask Me</h1>
        <p className="text-muted-foreground text-sm font-medium">
          Perguntas pagas: status, taxa de resposta e repasses.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total" value={overview.total.toLocaleString("pt-BR")} />
        <StatCard label="Respondidas" value={overview.answered.toLocaleString("pt-BR")} />
        <StatCard label="Aguardando resposta" value={overview.awaitingResponse.toLocaleString("pt-BR")} />
        <StatCard label="Aguardando pagamento" value={overview.pendingPayment.toLocaleString("pt-BR")} />
        <StatCard label="Recusadas" value={overview.declined.toLocaleString("pt-BR")} />
        <StatCard label="Expiradas" value={overview.expired.toLocaleString("pt-BR")} />
        <StatCard label="Taxa de resposta" value={`${(responseRate * 100).toFixed(1)}%`} hint="respondidas / resolvidas" />
        <StatCard label="Tempo médio resposta" value={formatDuration(overview.avgResponseSeconds)} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Repasses pendentes ({pendingRepasses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<AskMeQuestion>
            rows={pendingRepasses}
            getRowKey={(q) => q.id}
            emptyMessage="Nenhum repasse pendente."
            columns={[
              { key: "id", header: "Pergunta", cell: (q) => shortId(q.id) },
              { key: "creator", header: "Criador", cell: (q) => shortId(q.creatorId) },
              {
                key: "amount",
                header: "Repasse",
                align: "right",
                cell: (q) => formatBRL(q.creatorAmountCents),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reembolsos com falha ({failedRefunds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<AskMeQuestion>
            rows={failedRefunds}
            getRowKey={(q) => q.id}
            emptyMessage="Nenhum reembolso com falha."
            columns={[
              { key: "id", header: "Pergunta", cell: (q) => shortId(q.id) },
              { key: "asker", header: "Perguntou", cell: (q) => shortId(q.askerId) },
              {
                key: "amount",
                header: "Valor",
                align: "right",
                cell: (q) => formatBRL(q.amountCents),
              },
              {
                key: "error",
                header: "Erro",
                cell: (q) => (
                  <span className="text-destructive">{q.transferError ?? "—"}</span>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
