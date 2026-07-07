import { cn } from "@/lib/utils";

interface AlertDotProps {
  className?: string;
  /** Accessible label for screen readers (dot is visual only). */
  "aria-label"?: string;
}

/** Small red unread indicator (dot only), like the notification bell badge. */
export function AlertDot({ className, "aria-label": ariaLabel }: AlertDotProps) {
  return (
    <span
      className={cn(
        "absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-destructive shadow-cartoon-sm",
        className
      )}
      role="status"
      aria-label={ariaLabel}
    />
  );
}
