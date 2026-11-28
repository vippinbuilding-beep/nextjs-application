"use client";

import { useEffect, useRef } from "react";

import { cn } from "../lib/utils";
import { popElement } from "../lib/pop";

interface CountBadgeProps {
  count: number;
  className?: string;
}

/**
 * Small pill badge (same style as the notification bell unread indicator).
 * Dá um pulo quando o número muda (não no carregamento da página).
 */
export function CountBadge({ count, className }: CountBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(count);

  useEffect(() => {
    if (count !== previous.current && count > previous.current) popElement(ref.current);
    previous.current = count;
  }, [count]);

  if (count <= 0) return null;

  return (
    <span
      ref={ref}
      className={cn(
        "absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-semibold text-primary-foreground",
        className
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
