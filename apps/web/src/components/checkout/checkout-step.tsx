"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { popElement } from "@vippin/ui/lib/pop";
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

/**
 * One numbered step of the checkout (Conta, Entrega, Frete, Pagamento).
 * Ao ser concluído, o número vira check com um pulo; ao destravar, o
 * conteúdo desliza para dentro. No carregamento da página nada anima.
 */
export function CheckoutStep({ number, title, done, locked, children, className }: CheckoutStepProps) {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const previous = useRef({ done, locked });
  const [justUnlocked, setJustUnlocked] = useState(false);

  useEffect(() => {
    if (done && !previous.current.done) popElement(badgeRef.current);
    if (!locked && previous.current.locked) setJustUnlocked(true);
    previous.current = { done, locked };
  }, [done, locked]);

  return (
    <section
      aria-label={title}
      className={cn("flex gap-5 transition-opacity duration-300", locked && "opacity-55", className)}
    >
      <span
        ref={badgeRef}
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300",
          done ? "bg-success text-background" : "bg-secondary text-secondary-foreground"
        )}
      >
        {done ? <Check className="size-4" strokeWidth={3} /> : number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-0.5">
        <h2 className="text-xl font-semibold leading-tight">{title}</h2>
        {!locked && children ? (
          <div
            className={cn(
              "flex flex-col gap-4",
              justUnlocked && "animate-in fade-in-0 slide-in-from-top-2 duration-[420ms] ease-spring-soft"
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Divider between steps. */
export function CheckoutDivider() {
  return <hr className="border-border" />;
}
