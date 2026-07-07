"use client";

import { Compass, Home, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { NavUserActionsSkeleton } from "@/components/navigation/nav-user-actions-skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/ui/site-logo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getConsumerDisplayName } from "@/components/profile/consumer-nav-profile";
import { isConsumer, isCreator } from "@/lib/user-role";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  className?: string;
  loading?: boolean;
}

export function AppHeader({ className, loading = false }: AppHeaderProps) {
  const { user } = useAuth();

  if (!loading && !user) return null;

  const displayName =
    user && isConsumer(user)
      ? getConsumerDisplayName(user)
      : user?.creatorName ?? user?.name ?? "Perfil";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b-2 border-border bg-background/95 backdrop-blur-md",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Ir para o início">
          <SiteLogo size={32} nameClassName="text-lg hidden sm:inline" />
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/explore">
              <Compass className="size-4" />
              <span className="hidden sm:inline">Explorar</span>
            </Link>
          </Button>

          {!loading && user && isConsumer(user) && (
            <Button size="sm" variant="outline" asChild className="hidden md:inline-flex">
              <Link href="/my-products">Meus produtos</Link>
            </Button>
          )}

          {!loading && user && isCreator(user) && (
            <Button size="sm" variant="outline" asChild className="hidden md:inline-flex">
              <Link href="/">
                <LayoutDashboard className="size-4" />
                <span className="hidden sm:inline">Painel</span>
              </Link>
            </Button>
          )}

          <Button size="sm" variant="ghost" asChild className="md:hidden">
            <Link href="/" aria-label="Início">
              <Home className="size-4" />
            </Link>
          </Button>

          {loading || !user ? (
            <NavUserActionsSkeleton variant="full" />
          ) : (
            <>
              <NotificationBell />

              <Link
                href="/profile/edit"
                className="flex max-w-[9rem] items-center gap-2 rounded-xl border-2 border-border bg-background px-2 py-1 shadow-cartoon-sm transition-all hover:-translate-y-0.5 sm:max-w-[11rem]"
                aria-label={`Editar perfil de ${displayName}`}
              >
                <UserAvatar
                  userId={user.id}
                  name={displayName}
                  avatarPath={user.avatarPath}
                  avatarUrl={user.avatarUrl}
                  size="sm"
                />
                <span className="min-w-0 truncate text-xs font-bold sm:text-sm">
                  {displayName}
                </span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
