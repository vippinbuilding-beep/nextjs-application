import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { Button } from "@vippin/ui/button";

/**
 * Sticky owner actions on the public creator page — stays visible while scrolling.
 */
export function CreatorOwnerToolbar() {
  return (
    <div className="sticky top-3 z-20 -mb-6 flex flex-wrap items-center justify-center gap-2 rounded-full bg-card/95 p-2 pl-5 shadow-elevated sm:justify-between">
      <span className="text-muted-foreground hidden text-sm sm:inline">Você está vendo a sua vitrine como os visitantes veem.</span>
      <Button size="sm" variant="default" asChild>
        <Link href="/">
          <LayoutDashboard className="size-4" />
          <span className="hidden sm:inline">Ir para o painel</span>
          <span className="sm:hidden">Painel</span>
        </Link>
      </Button>
    </div>
  );
}
