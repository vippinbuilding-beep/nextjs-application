import * as React from "react";

import { cn } from "../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border border-input flex min-h-24 w-full min-w-0 rounded-xl bg-card px-3.5 py-2 text-base font-medium shadow-elevated-sm transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20",
        "aria-invalid:border-destructive aria-invalid:text-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
