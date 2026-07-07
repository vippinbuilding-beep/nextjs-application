"use client";

import {
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { AlertDot } from "@/components/ui/alert-dot";
import { SiteLogo } from "@/components/ui/site-logo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCreatorPendingAskMe } from "@/hooks/use-creator-pending-ask-me";
import {
  CREATOR_NAV_SECTIONS,
  isCreatorNavItemActive,
} from "@/lib/creator-dashboard/navigation";
import { cn } from "@/lib/utils";

interface CreatorSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function CreatorSidebar({ className, onNavigate }: CreatorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const pendingAskMe = useCreatorPendingAskMe(user?.id);

  const displayName = user?.creatorName ?? user?.name ?? "Criador";
  const hasPendingAskMe = pendingAskMe > 0;

  async function handleSignOut() {
    await signOut();
    router.replace("/");
    onNavigate?.();
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex shrink-0 items-center gap-3 border-b-2 border-border px-4 py-4">
        <UserAvatar
          userId={user!.id}
          name={displayName}
          avatarPath={user!.avatarPath}
          avatarUrl={user!.avatarUrl}
          size="md"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{displayName}</p>
          {user?.slug && (
            <p className="text-muted-foreground truncate text-xs font-medium">
              {user.slug}
            </p>
          )}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-5">
          {CREATOR_NAV_SECTIONS.map((section) => (
            <div key={section.id} className="flex flex-col gap-1.5">
              {section.label && (
                <p className="text-muted-foreground px-2 text-[11px] font-bold uppercase tracking-wide">
                  {section.label}
                </p>
              )}
              <ul className="flex flex-col gap-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isCreatorNavItemActive(pathname, item);
                  const showAskMeDot =
                    item.badgeKey === "pendingAskMe" && hasPendingAskMe;
                  const askMeAriaLabel =
                    pendingAskMe === 1
                      ? "Me pergunte, 1 pergunta não respondida"
                      : `Me pergunte, ${pendingAskMe} perguntas não respondidas`;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-label={
                          showAskMeDot ? askMeAriaLabel : undefined
                        }
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all",
                          active
                            ? "border-border bg-primary text-primary-foreground shadow-cartoon-sm"
                            : "border-transparent bg-transparent hover:border-border hover:bg-muted/60"
                        )}
                      >
                        <span className="relative shrink-0">
                          <Icon className="size-4" />
                          {showAskMeDot && (
                            <AlertDot aria-label={askMeAriaLabel} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <ChevronRight
                          className={cn(
                            "size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60",
                            active && "opacity-80"
                          )}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="flex shrink-0 flex-col gap-2 border-t-2 border-border px-3 py-4">
        {user?.slug && (
          <Button asChild variant="outline" size="sm" className="w-full justify-start">
            <Link href={`/@${user.slug}`} target="_blank" onClick={onNavigate}>
              <ExternalLink className="size-4" />
              Ver página pública
            </Link>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

interface CreatorMobileTopBarProps {
  title: string;
  onOpenMenu: () => void;
}

export function CreatorMobileTopBar({ title, onOpenMenu }: CreatorMobileTopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b-2 border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onOpenMenu}
        aria-label="Abrir menu do painel"
      >
        <Menu className="size-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Painel do criador
        </p>
        <p className="truncate text-sm font-bold">{title}</p>
      </div>
      <NotificationBell />
    </header>
  );
}

interface CreatorMobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatorMobileSidebar({ open, onOpenChange }: CreatorMobileSidebarProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar menu"
        onClick={() => onOpenChange(false)}
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col border-r-2 border-border bg-background shadow-cartoon-lg">
        <div className="flex shrink-0 items-center justify-between border-b-2 border-border px-4 py-3">
          <SiteLogo size={28} nameClassName="text-base" />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </Button>
        </div>
        <CreatorSidebar
          className="min-h-0 flex-1"
          onNavigate={() => onOpenChange(false)}
        />
      </aside>
    </div>
  );
}
