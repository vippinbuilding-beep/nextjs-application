"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AppNotification } from "@/core/models/notification";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { notificationRepository } from "@/services/repository-factory";

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

export function NotificationBell({ className }: NotificationBellProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

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
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  if (!user?.onboardingCompleted) {
    return null;
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
    if (!user?.id || unread === 0) return;
    await notificationRepository.markAllAsRead(user.id);
    setUnread(0);
    setItems((prev) =>
      prev.map((row) => ({ ...row, readAt: row.readAt ?? new Date() }))
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
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
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-border bg-primary text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b-2 border-border px-3 py-2">
          <p className="text-sm font-bold">Notificações</p>
          {unread > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={() => void handleMarkAllRead()}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Carregando...
            </p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Nenhuma notificação ainda.
            </p>
          ) : (
            <ul className="flex flex-col">
              {items.map((item) => {
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

                return (
                  <li key={item.id}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => void handleClick(item)}
                        className={cn(
                          "block border-b border-border px-3 py-3 transition-colors hover:bg-muted/50",
                          !item.readAt && "bg-primary/10"
                        )}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleClick(item)}
                        className={cn(
                          "w-full border-b border-border px-3 py-3 text-left transition-colors hover:bg-muted/50",
                          !item.readAt && "bg-primary/10"
                        )}
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
      </PopoverContent>
    </Popover>
  );
}
