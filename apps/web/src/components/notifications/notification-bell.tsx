"use client";

import { Bell, BellOff, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@vippin/ui/button";
import { CountBadge } from "@vippin/ui/count-badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@vippin/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@vippin/ui/popover";
import { NavNotificationSkeleton } from "@/components/navigation/nav-user-actions-skeleton";
import type { AppNotification } from "@vippin/core/models/notification";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  getNotificationTone,
  NOTIFICATION_TONE_STYLES,
} from "@/lib/notifications/appearance";
import { subscribeToNotificationInserts } from "@/lib/notifications/realtime";
import { cn } from "@vippin/ui/lib/utils";
import { notificationRepository } from "@vippin/supabase/factories/repository-factory";
import { toast, TOAST_MESSAGES } from "@/lib/toast";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "ontem" : `há ${days} dias`;
}

interface NotificationListProps {
  items: AppNotification[];
  loading: boolean;
  unread: number;
  onItemClick: (item: AppNotification) => void;
  onMarkAllRead: () => void;
  markingAllRead?: boolean;
  /** Título acessível: no diálogo (celular) precisa ser o DialogTitle. */
  title: ReactNode;
  /** Botão de fechar (só na folha do celular; no desktop clica fora). */
  closeButton?: ReactNode;
}

function NotificationList({
  items,
  loading,
  unread,
  onItemClick,
  onMarkAllRead,
  markingAllRead = false,
  title,
  closeButton,
}: NotificationListProps) {
  // Notificações que chegam com a lista aberta entram animadas; as que já
  // estavam lá quando ela abriu, não.
  const knownIds = useRef<Set<string> | null>(null);
  if (knownIds.current === null && !loading) {
    knownIds.current = new Set(items.map((item) => item.id));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-2">
        {title}
        <div className="flex shrink-0 items-center gap-1">
          {unread > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-link h-8 px-2.5 text-xs"
              disabled={markingAllRead}
              onClick={() => void onMarkAllRead()}
            >
              {markingAllRead ? "Marcando..." : "Marcar todas como lidas"}
            </Button>
          )}
          {closeButton}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {loading && items.length === 0 ? (
          <ul className="flex flex-col gap-1" aria-label="Carregando notificações">
            {[0, 1, 2].map((key) => (
              <li key={key} className="flex gap-3 px-3 py-3">
                <span className="bg-muted size-9 shrink-0 animate-pulse rounded-xl" />
                <span className="flex flex-1 flex-col gap-2 pt-1">
                  <span className="bg-muted h-3 w-2/3 animate-pulse rounded-full" />
                  <span className="bg-muted h-3 w-full animate-pulse rounded-full" />
                </span>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
              <BellOff className="size-5" />
            </span>
            <p className="font-semibold">Tudo em dia</p>
            <p className="text-muted-foreground text-sm">
              Vendas, perguntas e envios aparecem aqui.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <NotificationItem
                key={item.id}
                item={item}
                isNew={knownIds.current !== null && !knownIds.current.has(item.id)}
                onClick={onItemClick}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NotificationItem({
  item,
  isNew,
  onClick,
}: {
  item: AppNotification;
  isNew: boolean;
  onClick: (item: AppNotification) => void;
}) {
  const { icon: Icon, iconClassName } = NOTIFICATION_TONE_STYLES[getNotificationTone(item.type)];
  const unread = !item.readAt;

  const content = (
    <>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", iconClassName)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-sm leading-snug", unread ? "font-semibold" : "font-medium")}>
          {item.title}
        </span>
        {item.body && (
          <span className="text-muted-foreground line-clamp-2 text-xs leading-snug">{item.body}</span>
        )}
        <span className="text-muted-foreground mt-0.5 text-xs">
          {formatRelativeTime(item.createdAt)}
        </span>
      </span>
      {unread && (
        <span className="bg-ring mt-1.5 size-2 shrink-0 rounded-full">
          <span className="sr-only">Não lida</span>
        </span>
      )}
    </>
  );

  // Hover e foco com fundo opaco do tema (antes era translúcido e sumia).
  const className =
    "flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition-colors outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-4 focus-visible:ring-ring/30";

  return (
    <li
      className={cn(
        isNew && "animate-in fade-in-0 slide-in-from-top-2 duration-[420ms] ease-spring"
      )}
    >
      {item.href ? (
        <Link href={item.href} onClick={() => void onClick(item)} className={className}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={() => void onClick(item)} className={className}>
          {content}
        </button>
      )}
    </li>
  );
}

/**
 * Sininho de notificações. No desktop abre um painel preso ao sininho
 * (popover); no celular, uma folha que sobe de baixo. Mesma lista nos dois.
 */
export function NotificationBell({ className }: { className?: string }) {
  const { user } = useAuth();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        notificationRepository.listRecent(user.id, 15),
        notificationRepository.countUnread(user.id),
      ]);
      setItems(list);
      setUnread(count);
    } catch {
      // ignore transient errors
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [user?.id]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;

    return subscribeToNotificationInserts(user.id, () => {
      void refreshRef.current();
    });
  }, [user?.id]);

  if (!user?.onboardingCompleted) {
    return null;
  }

  if (!ready && loading) {
    return <NavNotificationSkeleton aria-label="Carregando notificações" />;
  }

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      await refresh();
    }
  }

  async function handleClick(item: AppNotification) {
    if (!item.readAt) {
      await notificationRepository.markAsRead(item.id);
      setUnread((count) => Math.max(0, count - 1));
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, readAt: new Date() } : row))
      );
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    if (!user?.id || unread === 0 || markingAllRead) return;

    setMarkingAllRead(true);
    try {
      await notificationRepository.markAllAsRead(user.id);
      setUnread(0);
      setItems((prev) => prev.map((row) => ({ ...row, readAt: row.readAt ?? new Date() })));
      toast.success(TOAST_MESSAGES.notificationsRead);
    } catch {
      toast.error("Não foi possível marcar as notificações como lidas.");
    } finally {
      setMarkingAllRead(false);
    }
  }

  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("relative", className)}
      aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : "Notificações"}
    >
      <Bell className="size-4" />
      <CountBadge count={unread} />
    </Button>
  );

  const listProps = {
    items,
    loading,
    unread,
    onItemClick: handleClick,
    onMarkAllRead: handleMarkAllRead,
    markingAllRead,
  };

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          showCloseButton={false}
          // Folha que sobe de baixo: presa à base da tela, cantos de cima.
          className="top-auto bottom-0 flex h-[min(85svh,640px)] w-full max-w-none translate-y-0 flex-col gap-0 overflow-hidden rounded-t-3xl rounded-b-none border-x-0 border-b-0 p-0"
        >
          <NotificationList
            {...listProps}
            title={<DialogTitle className="text-lg">Notificações</DialogTitle>}
            closeButton={
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon" className="size-9" aria-label="Fechar">
                  <X className="size-4" />
                </Button>
              </DialogClose>
            }
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex max-h-[min(70vh,560px)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
      >
        <NotificationList
          {...listProps}
          title={<h2 className="text-base font-semibold">Notificações</h2>}
        />
      </PopoverContent>
    </Popover>
  );
}
