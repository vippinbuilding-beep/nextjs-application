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
      className={cn("flex gap-5", locked && "opacity-55", className)}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          done ? "bg-success text-background" : "bg-secondary text-secondary-foreground"
        )}
      >
        {done ? <Check className="size-4" strokeWidth={3} /> : number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-0.5">
        <h2 className="text-xl font-semibold leading-tight">{title}</h2>
        {!locked && children ? children : null}
      </div>
    </section>
  );
}

/** Divider between steps. */
export function CheckoutDivider() {
  return <hr className="border-border" />;
}
