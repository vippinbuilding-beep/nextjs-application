import Link from "next/link";

import type { UserRole } from "@vippin/core/models/user";
import type { AdminUserListItem } from "@vippin/core/repositories/admin-user-repository";
import {
  adminAnalyticsRepository,
  adminUserRepository,
} from "@vippin/supabase/factories/admin-repository-factory";
import { Card, CardContent, CardHeader, CardTitle } from "@vippin/ui/card";
import { DataTable } from "@vippin/ui/data-table";

import { UserGrowthChart } from "@/components/charts/user-growth-chart";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { rangeFromSearchParams } from "@/lib/dashboard/range";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function parseRole(value?: string): UserRole | undefined {
  return value === "creator" || value === "consumer" ? value : undefined;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const role = parseRole(sp.role);
  const page = Math.max(1, Number(sp.page) || 1);
  const range = rangeFromSearchParams(sp);

  const [result, growth] = await Promise.all([
    adminUserRepository.search({ query: query || undefined, role, page, pageSize: PAGE_SIZE }),
    adminAnalyticsRepository.getUserGrowthByDay(range),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (role) params.set("role", role);
    params.set("page", String(nextPage));
    return `/usuarios?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground text-sm font-medium">
          {result.total.toLocaleString("pt-BR")} usuários no total.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Novos usuários</CardTitle>
          <DateRangePicker from={range.from} to={range.to} />
        </CardHeader>
        <CardContent>
          {growth.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm font-medium">
              Nenhum cadastro no período.
            </p>
          ) : (
            <UserGrowthChart data={growth} />
          )}
        </CardContent>
      </Card>

      <form method="get" action="/usuarios" className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar por nome, e-mail ou handle"
          className="flex-1 rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-medium"
        />
        <select
          name="role"
          defaultValue={role ?? ""}
          className="rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold"
        >
          <option value="">Todos</option>
          <option value="creator">Criadores</option>
          <option value="consumer">Consumidores</option>
        </select>
        <button
          type="submit"
          className="rounded-xl border-2 border-border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-cartoon-sm"
        >
          Buscar
        </button>
      </form>

      <DataTable<AdminUserListItem>
        rows={result.items}
        getRowKey={(u) => u.id}
        emptyMessage="Nenhum usuário encontrado."
        columns={[
          {
            key: "name",
            header: "Usuário",
            cell: (u) => (
              <Link href={`/usuarios/${u.id}`} className="font-semibold underline-offset-2 hover:underline">
                {u.creatorName || u.displayName || u.email || u.id.slice(0, 8)}
              </Link>
            ),
          },
          { key: "email", header: "E-mail", cell: (u) => u.email ?? "—" },
          {
            key: "role",
            header: "Perfil",
            cell: (u) => (u.role === "consumer" ? "Consumidor" : "Criador"),
          },
          {
            key: "handle",
            header: "Handle",
            cell: (u) => (u.slug ? `@${u.slug}` : "—"),
          },
          { key: "createdAt", header: "Cadastro", cell: (u) => formatDate(u.createdAt) },
        ]}
      />

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={buildPageHref(page - 1)}
              className="rounded-xl border-2 border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted"
            >
              Anterior
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={buildPageHref(page + 1)}
              className="rounded-xl border-2 border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted"
            >
              Próxima
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
