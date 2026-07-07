import { cn } from "@/lib/utils";

const skeletonBase =
  "relative overflow-hidden rounded-xl border-2 border-border bg-muted shadow-cartoon-sm";

const shimmer =
  "after:absolute after:inset-0 after:-translate-x-full after:animate-[nav-shimmer_1.4s_ease-in-out_infinite] after:bg-linear-to-r after:from-transparent after:via-background/70 after:to-transparent";

interface NavNotificationSkeletonProps {
  className?: string;
  "aria-label"?: string;
}

export function NavNotificationSkeleton({
  className,
  "aria-label": ariaLabel,
}: NavNotificationSkeletonProps) {
  return (
    <div
      className={cn(skeletonBase, shimmer, "size-10 shrink-0", className)}
      role="status"
      aria-label={ariaLabel ?? "Carregando notificações"}
    />
  );
}

interface NavAvatarSkeletonProps {
  withLabel?: boolean;
  className?: string;
}

export function NavAvatarSkeleton({
  withLabel = false,
  className,
}: NavAvatarSkeletonProps) {
  if (withLabel) {
    return (
      <div
        className={cn(
          skeletonBase,
          shimmer,
          "flex h-10 max-w-[11rem] items-center gap-2 px-2",
          className
        )}
        aria-hidden
      >
        <div className="size-8 shrink-0 rounded-full border-2 border-border bg-background/80" />
        <div className="hidden h-3.5 min-w-16 flex-1 rounded-md bg-background/80 sm:block" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        skeletonBase,
        shimmer,
        "size-9 shrink-0 rounded-full",
        className
      )}
      aria-hidden
    />
  );
}

interface NavUserActionsSkeletonProps {
  variant?: "compact" | "full";
  className?: string;
}

export function NavUserActionsSkeleton({
  variant = "compact",
  className,
}: NavUserActionsSkeletonProps) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-2", className)}
      aria-busy="true"
      aria-label="Carregando perfil e notificações"
    >
      <NavNotificationSkeleton />
      <NavAvatarSkeleton withLabel={variant === "full"} />
    </div>
  );
}
