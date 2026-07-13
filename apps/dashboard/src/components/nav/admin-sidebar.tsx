"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircleQuestion,
  Package,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@vippin/ui/button";
import { Sidebar, SidebarLink } from "@vippin/ui/sidebar";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/usuarios", label: "Usuários", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/ask-me", label: "Ask Me", icon: MessageCircleQuestion },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <Sidebar
      header={
        <span className="text-lg font-bold tracking-tight">Vippin Admin</span>
      }
      footer={
        <div className="flex flex-col gap-2">
          {user?.email ? (
            <span className="text-muted-foreground truncate text-xs font-medium">
              {user.email}
            </span>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void signOut()}
          >
            Sair
          </Button>
        </div>
      }
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarLink
            key={item.href}
            href={item.href}
            active={isActive(pathname, item.href)}
            icon={<Icon className="h-4 w-4" />}
          >
            {item.label}
          </SidebarLink>
        );
      })}
    </Sidebar>
  );
}
