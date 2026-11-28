import { Check } from "lucide-react";

import { cn } from "@vippin/ui/lib/utils";

interface CheckoutStepProps {
  number: number;
  title: string;
  /** Step already finished: shows a check and dims the header. */
  done?: boolean;
  /** Step not reachable yet: header only, content hidden. */
  locked?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/** One numbered step of the checkout (Conta, Entrega, Frete, Pagamento). */
export function CheckoutStep({ number, title, done, locked, children, className }: CheckoutStepProps) {
  return (
    <section
      aria-label={title}
      className={cn("flex flex-col gap-4", locked && "opacity-60", className)}
    >
      <h2 className="flex items-center gap-3 text-base font-bold">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            done ? "bg-success text-background" : "bg-secondary text-secondary-foreground"
          )}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : number}
        </span>
        {title}
      </h2>
      {!locked && children ? <div className="animate-rise">{children}</div> : null}
    </section>
  );
}

/** Divider between steps. */
export function CheckoutDivider() {
  return <hr className="border-border" />;
}
