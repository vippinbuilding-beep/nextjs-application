import Link from "next/link";

import { formatBRL } from "@vippin/core/domain/money";
import type { AskMeQuestionStatus } from "@vippin/core/models/ask-me-question";
import type { AdminAskMeListItem } from "@vippin/core/repositories/admin-ask-me-repository";
import {
  adminAnalyticsRepository,
  adminAskMeQuestionRepository,
  adminAskMeRepository,
} from "@vippin/supabase/factories/admin-repository-factory";
import { Card, CardContent, CardHeader, CardTitle } from "@vippin/ui/card";
import { DataTable } from "@vippin/ui/data-table";
import { StatCard } from "@vippin/ui/stat-card";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<AskMeQuestionStatus, string> = {
  pending_payment: "Aguardando pagamento",
  awaiting_response: "Aguardando resposta",
  answered: "Respondida",
  declined: "Recusada",
  expired: "Expirada",
  payment_expired: "Pagamento expirado",
  failed: "Falhou",
};

const STATUS_OPTIONS: AskMeQuestionStatus[] = [
  "answered",
  "declined",
  "expired",
  "awaiting_response",
  "pending_payment",
  "payment_expired",
  "failed",
];

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(seconds / 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} dias`;
}

function formatDateTime(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function questionCell(text: string) {
  return (
    <span title={text} className="block max-w-xs">
      {truncate(text)}
    </span>
  );
}

function parseStatus(value?: string): AskMeQuestionStatus | undefined {
  return STATUS_OPTIONS.includes(value as AskMeQuestionStatus)
    ? (value as AskMeQuestionStatus)
    : undefined;
}

export default async function AskMePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = Math.max(1, Number(sp.page) || 1);

  const [overview, pendingRepassesRaw, failedRefundsRaw, list] = await Promise.all([
    adminAnalyticsRepository.getAskMeOverview(),
    adminAskMeQuestionRepository.listPendingCreatorRepasses(100),
    adminAskMeQuestionRepository.listFailedRefunds(100, 0),
    adminAskMeRepository.search({ status, page, pageSize: PAGE_SIZE }),
  ]);

  const [pendingRepasses, failedRefunds] = await Promise.all([
    adminAskMeRepository.enrichWithNames(pendingRepassesRaw),
    adminAskMeRepository.enrichWithNames(failedRefundsRaw),
  ]);

  const resolved = overview.answered + overview.declined + overview.expired;
  const responseRate = resolved > 0 ? overview.answered / resolved : 0;
  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));

  const buildHref = (nextStatus?: AskMeQuestionStatus, nextPage = 1) => {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    params.set("page", String(nextPage));
    return `/ask-me?${params.toString()}`;
  };

  const nameColumns = [
    {
      key: "question",
      header: "Pergunta",
      cell: (q: AdminAskMeListItem) => questionCell(q.questionText),
    },
    {
      key: "creator",
      header: "Criador",
      cell: (q: AdminAskMeListItem) => q.creatorName ?? "—",
    },
  ];

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
          <CardTitle>Todas as perguntas ({list.total.toLocaleString("pt-BR")})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref(undefined)}
              className={`rounded-xl border-2 border-border px-3 py-1.5 text-sm font-semibold ${!status ? "bg-primary text-primary-foreground shadow-cartoon-sm" : "bg-card hover:bg-muted"
                }`}
            >
              Todas
            </Link>
            {STATUS_OPTIONS.map((opt) => (
              <Link
                key={opt}
                href={buildHref(opt)}
                className={`rounded-xl border-2 border-border px-3 py-1.5 text-sm font-semibold ${status === opt ? "bg-primary text-primary-foreground shadow-cartoon-sm" : "bg-card hover:bg-muted"
                  }`}
              >
                {STATUS_LABELS[opt]}
              </Link>
            ))}
          </div>

          <DataTable<AdminAskMeListItem>
            rows={list.items}
            getRowKey={(q) => q.id}
            emptyMessage="Nenhuma pergunta encontrada."
            columns={[
              {
                key: "question",
                header: "Pergunta",
                cell: (q) => questionCell(q.questionText),
              },
              {
                key: "creator",
                header: "Criador",
                cell: (q) => q.creatorName ?? "—",
              },
              {
                key: "asker",
                header: "Perguntou",
                cell: (q) => q.askerName ?? "—",
              },
              {
                key: "status",
                header: "Status",
                cell: (q) => STATUS_LABELS[q.status] ?? q.status,
              },
              {
                key: "amount",
                header: "Valor",
                align: "right",
                cell: (q) => formatBRL(q.amountCents),
              },
              {
                key: "createdAt",
                header: "Criada em",
                cell: (q) => formatDateTime(q.createdAt),
              },
            ]}
          />

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-medium">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={buildHref(status, page - 1)}
                  className="rounded-xl border-2 border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted"
                >
                  Anterior
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={buildHref(status, page + 1)}
                  className="rounded-xl border-2 border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted"
                >
                  Próxima
                </Link>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repasses pendentes ({pendingRepasses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<AdminAskMeListItem>
            rows={pendingRepasses}
            getRowKey={(q) => q.id}
            emptyMessage="Nenhum repasse pendente."
            columns={[
              ...nameColumns,
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
          <DataTable<AdminAskMeListItem>
            rows={failedRefunds}
            getRowKey={(q) => q.id}
            emptyMessage="Nenhum reembolso com falha."
            columns={[
              {
                key: "question",
                header: "Pergunta",
                cell: (q) => questionCell(q.questionText),
              },
              {
                key: "asker",
                header: "Perguntou",
                cell: (q) => q.askerName ?? "—",
              },
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
