import { formatBRL } from "@vippin/core/domain/money";
import type {
  ProductWithoutSales,
  TopProduct,
} from "@vippin/core/repositories/admin-analytics-repository";
import { adminAnalyticsRepository } from "@vippin/supabase/factories/admin-repository-factory";
import { Card, CardContent, CardHeader, CardTitle } from "@vippin/ui/card";
import { DataTable } from "@vippin/ui/data-table";
import { StatCard } from "@vippin/ui/stat-card";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  single_lesson: "Aula avulsa",
  document: "Documento",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function creatorLabel(name: string | null, id: string): string {
  return name || id.slice(0, 8);
}

export default async function ProdutosPage() {
  const [byType, topProducts, withoutSales] = await Promise.all([
    adminAnalyticsRepository.getProductsByType(),
    adminAnalyticsRepository.getTopProducts(20),
    adminAnalyticsRepository.getProductsWithoutSales(20),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        <p className="text-muted-foreground text-sm font-medium">
          Desempenho de vendas e catálogo.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {byType.map((t) => (
          <StatCard
            key={t.type}
            label={TYPE_LABELS[t.type] ?? t.type}
            value={t.count.toLocaleString("pt-BR")}
          />
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Mais vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<TopProduct>
            rows={topProducts}
            getRowKey={(p) => p.productId}
            emptyMessage="Nenhuma venda registrada ainda."
            columns={[
              { key: "title", header: "Produto", cell: (p) => p.title },
              {
                key: "creator",
                header: "Criador",
                cell: (p) => creatorLabel(p.creatorName, p.creatorId),
              },
              {
                key: "sales",
                header: "Vendas",
                align: "right",
                cell: (p) => p.salesCount.toLocaleString("pt-BR"),
              },
              {
                key: "gross",
                header: "Bruto",
                align: "right",
                cell: (p) => formatBRL(p.grossCents),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos sem vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<ProductWithoutSales>
            rows={withoutSales}
            getRowKey={(p) => p.productId}
            emptyMessage="Todos os produtos já venderam."
            columns={[
              { key: "title", header: "Produto", cell: (p) => p.title },
              {
                key: "creator",
                header: "Criador",
                cell: (p) => creatorLabel(p.creatorName, p.creatorId),
              },
              {
                key: "createdAt",
                header: "Criado em",
                cell: (p) => formatDate(p.createdAt),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
