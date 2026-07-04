import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-2 border-border flex min-h-24 w-full min-w-0 rounded-xl bg-background px-3.5 py-2 text-base font-medium shadow-cartoon-sm transition-all outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:shadow-cartoon focus-visible:-translate-y-0.5",
        "aria-invalid:border-destructive aria-invalid:text-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
