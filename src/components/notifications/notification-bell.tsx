"use client";

import { Bell, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CountBadge } from "@/components/ui/count-badge";
import { NavNotificationSkeleton } from "@/components/navigation/nav-user-actions-skeleton";
import type { AppNotification } from "@/core/models/notification";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  getNotificationTone,
  NOTIFICATION_TONE_STYLES,
} from "@/lib/notifications/appearance";
import { subscribeToNotificationInserts } from "@/lib/notifications/realtime";
import { cn } from "@/lib/utils";
import { notificationRepository } from "@/services/repository-factory";
import { toast, TOAST_MESSAGES } from "@/lib/toast";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

interface NotificationBellProps {
  className?: string;
}

interface NotificationListProps {
  items: AppNotification[];
  loading: boolean;
  unread: number;
  onItemClick: (item: AppNotification) => void;
  onMarkAllRead: () => void;
  markingAllRead?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

function NotificationList({
  items,
  loading,
  unread,
  onItemClick,
  onMarkAllRead,
  markingAllRead = false,
  showCloseButton = false,
  className,
}: NotificationListProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-border px-4 py-3">
        <DialogTitle className="min-w-0 shrink text-base font-bold sm:text-lg">
          Notificações
        </DialogTitle>
        <div className="flex shrink-0 items-center gap-3">
          {unread > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto shrink-0 px-2 py-1 text-xs whitespace-nowrap"
              disabled={markingAllRead}
              onClick={() => void onMarkAllRead()}
            >
              {markingAllRead ? "Marcando..." : "Marcar todas como lidas"}
            </Button>
          )}
          {showCloseButton && (
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </Button>
            </DialogClose>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">
            Carregando...
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">
            Nenhuma notificação ainda.
          </p>
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => {
              const tone = getNotificationTone(item.type);
              const styles = NOTIFICATION_TONE_STYLES[tone];
              const content = (
                <>
                  <p className="text-sm font-bold leading-tight">{item.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                    {item.body}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </>
              );

              const itemClassName = cn(
                "block border-b border-border px-4 py-3.5 transition-colors",
                styles.itemInteractive,
                !item.readAt && styles.itemUnread
              );

              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => void onItemClick(item)}
                      className={itemClassName}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onItemClick(item)}
                      className={cn(itemClassName, "w-full text-left")}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function NotificationBell({ className }: NotificationBellProps) {
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
    return (
      <NavNotificationSkeleton aria-label="Carregando notificações" />
    );
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
        prev.map((row) =>
          row.id === item.id ? { ...row, readAt: new Date() } : row
        )
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
      setItems((prev) =>
        prev.map((row) => ({ ...row, readAt: row.readAt ?? new Date() }))
      );
      toast.success(TOAST_MESSAGES.notificationsRead);
    } catch {
      toast.error("Não foi possível marcar as notificações como lidas.");
    } finally {
      setMarkingAllRead(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("relative", className)}
          aria-label={
            unread > 0
              ? `Notificações, ${unread} não lidas`
              : "Notificações"
          }
        >
          <Bell className="size-4" />
          <CountBadge count={unread} />
        </Button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          isMobile
            ? "fixed inset-0 top-0 left-0 z-50 h-svh max-h-svh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 shadow-none"
            : "max-h-[min(85vh,640px)] w-full max-w-md"
        )}
      >
        <NotificationList
          items={items}
          loading={loading}
          unread={unread}
          onItemClick={handleClick}
          onMarkAllRead={handleMarkAllRead}
          markingAllRead={markingAllRead}
          showCloseButton
        />
      </DialogContent>
    </Dialog>
  );
}
