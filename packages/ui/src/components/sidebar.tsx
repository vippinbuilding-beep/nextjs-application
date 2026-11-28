import * as React from "react";

import { cn } from "../lib/utils";

export interface SidebarProps {
  /** Conteúdo do topo (ex.: logo/título). */
  header?: React.ReactNode;
  /** Conteúdo do rodapé (ex.: usuário/logout). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shell de barra lateral no estilo da Vippin. Framework-agnóstico e
 * apresentacional: não conhece rotas nem router. O app compõe os itens (ver
 * {@link SidebarLink}) e resolve o estado ativo.
 */
export function Sidebar({ header, footer, children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "bg-card flex h-svh w-60 shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-4",
        className
      )}
    >
      {header ? <div className="px-1">{header}</div> : null}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">{children}</nav>
      {footer ? <div className="mt-auto px-1">{footer}</div> : null}
    </aside>
  );
}

export interface SidebarLinkProps {
  href: string;
  active?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Item de navegação da barra lateral. Renderiza um `<a>` puro (sem acoplar a um
 * router específico); passe `active` para destacar o item corrente.
 */
export function SidebarLink({
  href,
  active,
  icon,
  children,
  className,
}: SidebarLinkProps) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors [&_svg]:transition-transform [&_svg]:duration-200 [&_svg]:ease-spring hover:[&_svg]:scale-110",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elevated-sm"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </a>
  );
}
