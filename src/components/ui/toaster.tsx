"use client";

import { Bell, CheckCircle2, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  dismissToast,
  subscribeToasts,
  type ToastItem,
} from "@/lib/toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-999 flex flex-col items-start gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
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
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-2 border-border bg-background p-4 shadow-cartoon-lg",
        "animate-in fade-in slide-in-from-bottom-4 duration-200"
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
        className="shrink-0 rounded-lg border-2 border-transparent p-0.5 transition-colors hover:border-border hover:bg-muted"
        onClick={() => dismissToast(item.id)}
        aria-label="Fechar aviso"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function NotificationToastCard({ item }: { item: ToastItem }) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-primary shadow-cartoon-sm">
        <Bell className="size-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-snug">{item.title}</p>
        {item.body && (
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
            {item.body}
          </p>
        )}
      </div>

      <button
        type="button"
        className="shrink-0 rounded-lg border-2 border-transparent p-0.5 transition-colors hover:border-border hover:bg-muted"
        onClick={() => dismissToast(item.id)}
        aria-label="Fechar notificação"
      >
        <X className="size-4" aria-hidden />
      </button>
    </>
  );

  const className = cn(
    "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-2 border-border bg-background p-4 shadow-cartoon-lg",
    "animate-in fade-in slide-in-from-bottom-4 duration-200"
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
