import {
  Banknote,
  BarChart3,
  Compass,
  LayoutDashboard,
  Library,
  Link2,
  MessageCircleQuestion,
  Package,
  User,
  type LucideIcon,
} from "lucide-react";

export interface CreatorNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match pathname exactly (used for home). */
  exact?: boolean;
  /** Key for dynamic badge counts resolved in the sidebar. */
  badgeKey?: "pendingAskMe";
}

export interface CreatorNavSection {
  id: "creator" | "consumer";
  label?: string;
  items: CreatorNavItem[];
}

export const CREATOR_NAV_SECTIONS: CreatorNavSection[] = [
  {
    id: "creator",
    items: [
      {
        href: "/",
        label: "Visão geral",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: "/painel/desempenho",
        label: "Desempenho",
        icon: BarChart3,
      },
      {
        href: "/painel/produtos",
        label: "Produtos",
        icon: Package,
      },
      {
        href: "/profile/ask-me",
        label: "Me pergunte",
        icon: MessageCircleQuestion,
        badgeKey: "pendingAskMe",
      },
      {
        href: "/profile/links",
        label: "Links",
        icon: Link2,
      },
      {
        href: "/painel/financeiro",
        label: "Financeiro",
        icon: Banknote,
      },
      {
        href: "/profile/edit",
        label: "Perfil",
        icon: User,
      },
    ],
  },
  {
    id: "consumer",
    label: "Como comprador",
    items: [
      {
        href: "/painel/biblioteca",
        label: "Biblioteca",
        icon: Library,
      },
      {
        href: "/painel/minhas-perguntas",
        label: "Minhas perguntas",
        icon: MessageCircleQuestion,
      },
      {
        href: "/explore",
        label: "Explorar",
        icon: Compass,
        exact: true,
      },
    ],
  },
];

/** Flat list for callers that only need creator-area items. */
export const CREATOR_NAV_ITEMS: CreatorNavItem[] = CREATOR_NAV_SECTIONS.flatMap(
  (section) => section.items
);

export function isCreatorNavItemActive(pathname: string, item: CreatorNavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === "/painel/produtos") {
    return pathname.startsWith("/painel/produtos") || pathname.startsWith("/products");
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
