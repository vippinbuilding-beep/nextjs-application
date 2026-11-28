"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
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
    <div role="status" className={TOAST_SURFACE}>
      {isSuccess ? (
        <CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" aria-hidden />
      ) : (
        <XCircle className="text-destructive mt-0.5 size-5 shrink-0" aria-hidden />
      )}

      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{item.message}</p>

      <CloseToastButton id={item.id} label="Fechar aviso" />
    </div>
  );
}

function NotificationToastCard({ item }: { item: ToastItem }) {
  const tone = item.notificationTone ?? "default";
  const { icon: Icon, iconClassName } = NOTIFICATION_TONE_STYLES[tone];

  const content = (
    <>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", iconClassName)}>
        <Icon className="size-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        {item.body && (
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{item.body}</p>
        )}
      </div>

      <CloseToastButton id={item.id} label="Fechar notificação" />
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        role="status"
        className={cn(TOAST_SURFACE, "transition-colors hover:bg-accent")}
        onClick={() => dismissToast(item.id)}
      >
        {content}
      </Link>
    );
  }

  return (
    <div role="status" className={TOAST_SURFACE}>
      {content}
    </div>
  );
}

/** Superfície única dos avisos: cartão do tema com sombra (sem borda). */
const TOAST_SURFACE =
  "bg-card text-card-foreground flex w-full items-start gap-3 rounded-2xl p-4 shadow-elevated-lg";

function CloseToastButton({ id, label }: { id: string; label: string }) {
  return (
    <button
      type="button"
      className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/30 -m-1 shrink-0 rounded-lg p-1 transition-colors outline-none focus-visible:ring-4"
      onClick={(event) => {
        // Dentro de um aviso com link: fechar não deve navegar.
        event.preventDefault();
        event.stopPropagation();
        dismissToast(id);
      }}
      aria-label={label}
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}
