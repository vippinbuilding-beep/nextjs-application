"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
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
