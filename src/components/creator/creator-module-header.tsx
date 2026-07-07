import { cn } from "@/lib/utils";

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
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm font-medium">{description}</p>
        )}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}
