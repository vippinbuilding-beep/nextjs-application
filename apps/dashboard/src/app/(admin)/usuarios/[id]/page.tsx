import Link from "next/link";
import { notFound } from "next/navigation";

import { formatBRL } from "@vippin/core/domain/money";
import { adminUserRepository } from "@vippin/supabase/factories/admin-repository-factory";
import { Card, CardContent, CardHeader, CardTitle } from "@vippin/ui/card";
import { StatCard } from "@vippin/ui/stat-card";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function UsuarioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await adminUserRepository.getDetail(id);

  if (!user) notFound();

  const displayName =
    user.creatorName || user.displayName || user.name || user.email || user.id;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/usuarios"
          className="text-muted-foreground text-sm font-semibold hover:underline"
        >
          ← Voltar para usuários
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{displayName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm font-medium">
          <span className="text-muted-foreground">{user.email ?? "sem e-mail"}</span>
          <span>
            Perfil: <strong>{user.role === "consumer" ? "Consumidor" : "Criador"}</strong>
            {user.slug ? ` · @${user.slug}` : ""}
          </span>
          <span className="text-muted-foreground">
            Cadastro: {formatDate(user.createdAt)} ·{" "}
            {user.onboardingCompleted ? "onboarding concluído" : "onboarding pendente"}
          </span>
          {user.bio ? <span className="mt-2">{user.bio}</span> : null}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Como criador
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Produtos" value={user.productsCount.toLocaleString("pt-BR")} />
          <StatCard label="Vendas" value={user.salesCount.toLocaleString("pt-BR")} />
          <StatCard label="Receita bruta" value={formatBRL(user.grossSalesCents)} />
          <StatCard label="Ask Me recebidas" value={user.askMeReceivedCount.toLocaleString("pt-BR")} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Como consumidor
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Compras" value={user.purchasesCount.toLocaleString("pt-BR")} />
          <StatCard label="Total gasto" value={formatBRL(user.purchasesSpentCents)} />
          <StatCard label="Ask Me enviadas" value={user.askMeAskedCount.toLocaleString("pt-BR")} />
          <StatCard
            label="Ask Me"
            value={user.askMeEnabled ? "Ativado" : "Desativado"}
            hint={user.askMePriceCents ? formatBRL(user.askMePriceCents) : undefined}
          />
        </div>
      </section>
    </div>
  );
}
