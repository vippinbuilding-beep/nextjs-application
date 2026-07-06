import { cn } from "@/lib/utils";

interface CountBadgeProps {
  count: number;
  className?: string;
}

/** Small pill badge (same style as the notification bell unread indicator). */
export function CountBadge({ count, className }: CountBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-border bg-primary text-[10px] font-bold text-primary-foreground",
        className
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
