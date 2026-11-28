"use client";

import { Bell, Banknote, CheckCircle2, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  dismissToast,
  subscribeToasts,
  type ToastItem,
} from "@/lib/toast";
import { NOTIFICATION_TONE_STYLES } from "@/lib/notifications/appearance";
import { AnimatePresence, exitFast, m, springs } from "@vippin/ui/lib/motion";
import { cn } from "@vippin/ui/lib/utils";
import { MotionMaxFeatures } from "@vippin/ui/motion-provider";

/** Arrastar além disso (ou soltar rápido) dispensa o aviso. */
const SWIPE_DISMISS_PX = 80;
const SWIPE_DISMISS_VELOCITY = 500;

/**
 * Avisos no canto da tela. Entram com mola, se reorganizam quando um sai
 * (`layout`) e podem ser arrastados para o lado para dispensar. As features
 * de layout/arrastar do Motion só baixam quando aparece o primeiro aviso.
 */
export default function ToastStack() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  return (
    <MotionMaxFeatures>
      <div
        className="pointer-events-none fixed bottom-0 right-0 z-999 flex w-full max-w-[calc(24rem+2rem)] flex-col items-stretch gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]"
        aria-live="polite"
        aria-relevant="additions"
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <SwipeableToast key={item.id} id={item.id}>
              <ToastCard item={item} />
            </SwipeableToast>
          ))}
        </AnimatePresence>
      </div>
    </MotionMaxFeatures>
  );
}

function SwipeableToast({ id, children }: { id: string; children: ReactNode }) {
  // Depois de arrastar, o clique que vem junto não abre o link do aviso.
  const dragged = useRef(false);

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: exitFast }}
      transition={springs.snappy}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={(_, info) => {
        if (
          Math.abs(info.offset.x) > SWIPE_DISMISS_PX ||
          Math.abs(info.velocity.x) > SWIPE_DISMISS_VELOCITY
        ) {
          dismissToast(id);
        }
        window.setTimeout(() => {
          dragged.current = false;
        }, 0);
      }}
      onClickCapture={(event) => {
        if (dragged.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      className="pointer-events-auto w-full touch-pan-y"
    >
      {children}
    </m.div>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  if (item.variant === "notification") {
    return <NotificationToastCard item={item} />;
  }

  const isSuccess = item.variant === "success";

  return (
    <div
      role="status"
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-border bg-background p-4"
      )}
    >
      {isSuccess ? (
        <CheckCircle2
          className="mt-0.5 size-5 shrink-0 text-foreground"
          aria-hidden
        />
      ) : (
        <XCircle
          className="mt-0.5 size-5 shrink-0 text-destructive"
          aria-hidden
        />
      )}

      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">
        {item.message}
      </p>

      <button
        type="button"
        className="shrink-0 rounded-lg border border-transparent p-0.5 transition-colors hover:border-border hover:bg-muted"
        onClick={() => dismissToast(item.id)}
        aria-label="Fechar aviso"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function NotificationToastCard({ item }: { item: ToastItem }) {
  const tone = item.notificationTone ?? "default";
  const styles = NOTIFICATION_TONE_STYLES[tone];
  const Icon =
    tone === "financial"
      ? Banknote
      : tone === "financial-error"
        ? XCircle
        : Bell;

  const content = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-elevated-sm",
          styles.icon
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        {item.body && (
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
            {item.body}
          </p>
        )}
      </div>

      <button
        type="button"
        className="shrink-0 rounded-lg border border-transparent p-0.5 transition-colors hover:border-border hover:bg-muted"
        onClick={() => dismissToast(item.id)}
        aria-label="Fechar notificação"
      >
        <X className="size-4" aria-hidden />
      </button>
    </>
  );

  const className = cn(
    "flex w-full items-start gap-3 rounded-xl border p-4 shadow-elevated-lg",
    styles.toast
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        role="status"
        className={cn(className, "transition-colors hover:bg-muted/40")}
        onClick={() => dismissToast(item.id)}
      >
        {content}
      </Link>
    );
  }

  return (
    <div role="status" className={className}>
      {content}
    </div>
  );
}
