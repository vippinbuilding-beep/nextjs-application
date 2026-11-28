import * as React from "react";

import { cn } from "../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border border-input flex h-10 w-full min-w-0 rounded-xl bg-card px-3.5 py-1 text-base font-medium shadow-elevated-sm transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20",
        "aria-invalid:border-destructive aria-invalid:text-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
