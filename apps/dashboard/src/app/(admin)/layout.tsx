import { AdminSidebar } from "@/components/nav/admin-sidebar";
import { LayoutBackground } from "@vippin/ui/layout-background";

/**
 * Shell autenticado do painel. Todas as rotas dentro de `(admin)` ganham a
 * barra lateral. As páginas públicas (`/login`, `/auth/callback`,
 * `/acesso-negado`) ficam fora deste route group e não recebem o shell.
 *
 * A proteção de acesso é feita no middleware (sessão + allowlist admin_users).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <div className="sticky top-0 h-svh">
        <AdminSidebar />
      </div>
      <LayoutBackground element="main" className="flex-1 overflow-x-hidden p-6" dotsOpacity={0.05}>
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </LayoutBackground>
    </div>
  );
}
