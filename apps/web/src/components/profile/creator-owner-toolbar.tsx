import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { Button } from "@vippin/ui/button";

/**
 * Sticky owner actions on the public creator page — stays visible while scrolling.
 */
export function CreatorOwnerToolbar() {
  return (
    <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-center gap-2 rounded-xl border-2 border-border bg-card/95 p-5 shadow-cartoon-sm backdrop-blur-sm sm:justify-end">
      <Button size="sm" variant="default" asChild>
        <Link href="/">
          <LayoutDashboard className="size-4" />
          <span className="hidden sm:inline">Gerenciar Conta</span>
          <span className="sm:hidden">Gerenciar</span>
        </Link>
      </Button>
    </div>
  );
}
