import { formatBRL } from "@vippin/core/domain/money";
import type { Order } from "@vippin/core/models/order";
import {
  adminAnalyticsRepository,
  adminOrderRepository,
} from "@vippin/supabase/factories/admin-repository-factory";
import { Card, CardContent, CardHeader, CardTitle } from "@vippin/ui/card";
import { DataTable } from "@vippin/ui/data-table";

export const dynamic = "force-dynamic";

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

function shortId(id: string): string {
  return id.slice(0, 8);
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  expired: "Expirado",
  refunded: "Reembolsado",
  failed: "Falhou",
};

export default async function FinanceiroPage() {
  const [ordersByStatus, pendingRepasses, failedRepasses] = await Promise.all([
    adminAnalyticsRepository.getOrdersByStatus(),
    adminOrderRepository.listPendingCreatorRepasses(100),
    adminOrderRepository.listFailedCreatorRepasses(100, 0),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground text-sm font-medium">
          Pedidos por status e repasses aos criadores.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos por status</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={ordersByStatus}
            getRowKey={(r) => r.status}
            emptyMessage="Nenhum pedido ainda."
            columns={[
              {
                key: "status",
                header: "Status",
                cell: (r) => STATUS_LABELS[r.status] ?? r.status,
              },
              {
                key: "count",
                header: "Qtd.",
                align: "right",
                cell: (r) => r.count.toLocaleString("pt-BR"),
              },
              {
                key: "amount",
                header: "Total",
                align: "right",
                cell: (r) => formatBRL(r.amountCents),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repasses pendentes ({pendingRepasses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Order>
            rows={pendingRepasses}
            getRowKey={(o) => o.id}
            emptyMessage="Nenhum repasse pendente."
            columns={[
              { key: "id", header: "Pedido", cell: (o) => shortId(o.id) },
              { key: "creator", header: "Criador", cell: (o) => shortId(o.creatorId) },
              {
                key: "amount",
                header: "Repasse",
                align: "right",
                cell: (o) => formatBRL(o.creatorAmountCents),
              },
              { key: "paidAt", header: "Pago em", cell: (o) => formatDateTime(o.paidAt) },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repasses com falha ({failedRepasses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Order>
            rows={failedRepasses}
            getRowKey={(o) => o.id}
            emptyMessage="Nenhum repasse com falha."
            columns={[
              { key: "id", header: "Pedido", cell: (o) => shortId(o.id) },
              { key: "creator", header: "Criador", cell: (o) => shortId(o.creatorId) },
              {
                key: "amount",
                header: "Repasse",
                align: "right",
                cell: (o) => formatBRL(o.creatorAmountCents),
              },
              {
                key: "error",
                header: "Erro",
                cell: (o) => (
                  <span className="text-destructive">{o.transferError ?? "—"}</span>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
