import { cn } from "@vippin/ui/lib/utils";

interface CreatorModuleHeaderProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function CreatorModuleHeader({
  title,
  description,
  className,
  children,
}: CreatorModuleHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">{title}</h1>
        {description && (
          <p className="text-muted-foreground max-w-[60ch] text-base sm:text-lg">{description}</p>
        )}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}
