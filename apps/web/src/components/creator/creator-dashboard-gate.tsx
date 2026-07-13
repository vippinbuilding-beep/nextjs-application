"use client";

import { usePathname } from "next/navigation";

import { CreatorDashboardShell } from "@/components/creator/creator-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { isCreatorShellPath } from "@/lib/creator-dashboard/paths";
import { isCreator } from "@/lib/user-role";

interface CreatorDashboardGateProps {
  children: React.ReactNode;
}

/**
 * Wraps creator dashboard routes in the sidebar shell. Consumers and public pages
 * pass through unchanged.
 */
export function CreatorDashboardGate({ children }: CreatorDashboardGateProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (!isCreatorShellPath(pathname) || loading || !user || !isCreator(user)) {
    return <>{children}</>;
  }

  return <CreatorDashboardShell>{children}</CreatorDashboardShell>;
}
