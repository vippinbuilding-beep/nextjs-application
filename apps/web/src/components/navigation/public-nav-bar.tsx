"use client";

import { Compass } from "lucide-react";
import Link from "next/link";

import { BackButton } from "@/components/navigation/back-button";
import { AuthEntryActions } from "@/components/navigation/auth-entry-actions";
import { NavUserActionsSkeleton } from "@/components/navigation/nav-user-actions-skeleton";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@vippin/ui/button";
import { cn } from "@vippin/ui/lib/utils";
import { UserAvatar } from "../ui/user-avatar";

interface PublicNavBarProps {
  /** Where the back button goes when there is no in-app history. */
  backFallback?: string;
  backLabel?: string;
  className?: string;
  sticky?: boolean;
}

/**
 * Standard public-page navigation: home logo, back, explore and notifications.
 * On mobile, actions are icon-only; labels appear from `sm` upward.
 */
export function PublicNavBar({
  backFallback = "/explore",
  backLabel = "Voltar",
  className,
  sticky = true,
}: PublicNavBarProps) {
  const { user, loading } = useAuth();

  return (
    <header
      className={cn(
        "z-30 border-b-2 border-border bg-background/95 backdrop-blur-md",
        sticky && "sticky top-0",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
        <BackButton
          fallback={backFallback}
          label={backLabel}
          responsiveLabel
          hideWhenNoHistory
          size="sm"
          className="shrink-0 px-2.5 sm:px-3"
          aria-label={backLabel}
        />

        <nav className="ml-auto flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" asChild className="px-2.5 sm:px-3">
            <Link href="/explore" aria-label="Explorar">
              <Compass className="size-4" />
              <span className="hidden sm:inline">Explorar</span>
            </Link>
          </Button>
          {loading ? (
            <NavUserActionsSkeleton variant="compact" />
          ) : user ? (
            <>
              <NotificationBell />
              <Link href={`/`} aria-label="Ir para o perfil" className="flex items-center">
                <UserAvatar
                  name={user.creatorName ?? user.consumerName ?? ""}
                  userId={user.id}
                  avatarPath={user.avatarPath}
                  avatarUrl={user.avatarUrl}
                />
              </Link>
            </>
          ) : (
            <AuthEntryActions />
          )}
        </nav>
      </div>
    </header>
  );
}
