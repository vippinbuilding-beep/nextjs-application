"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  CreatorMobileSidebar,
  CreatorMobileTopBar,
  CreatorSidebar,
} from "@/components/creator/creator-sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SiteLogo } from "@/components/ui/site-logo";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { getCreatorModuleTitle } from "@/lib/creator-dashboard/paths";

interface CreatorDashboardShellProps {
  children: React.ReactNode;
}

export function CreatorDashboardShell({ children }: CreatorDashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const moduleTitle = getCreatorModuleTitle(pathname);

  return (
    <LayoutBackground
      element="main"
      dotsOpacity={0.18}
      className="flex min-h-svh flex-col"
    >
      <CreatorMobileTopBar
        title={moduleTitle}
        onOpenMenu={() => setMobileMenuOpen(true)}
      />
      <CreatorMobileSidebar
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r-2 border-border bg-background/80 lg:flex xl:w-72">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-border px-5 py-4">
            <SiteLogo size={32} nameClassName="text-lg" />
            <NotificationBell />
          </div>
          <CreatorSidebar className="min-h-0 flex-1" />
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
            {children}
          </div>
        </div>
      </div>
    </LayoutBackground>
  );
}
