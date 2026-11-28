"use client";

import { Children, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "../lib/utils";

/**
 * Revela os filhos em cascata quando entram na tela, uma vez só (CSS +
 * IntersectionObserver, sem biblioteca). Só "arma" (esconde) o que está
 * abaixo da dobra no carregamento: o que já está na tela aparece pronto, sem
 * atrasar o LCP; sem JS, tudo aparece normal. Movimento reduzido: sem efeito.
 *
 * Cada filho vira um item (`li` em listas, `div` no resto). Para listas
 * grandes, a cascata para no 8º item (o resto entra junto).
 */
export function RevealGroup({
  children,
  className,
  as: Component = "div",
  itemClassName,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
  itemClassName?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "armed" | "revealed">("idle");

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    setState("armed");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("revealed");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const Item = Component === "div" ? "div" : "li";

  return (
    <Component ref={ref as never} data-reveal={state} className={cn("group/reveal", className)}>
      {Children.map(children, (child, index) => (
        <Item
          style={{ transitionDelay: state === "revealed" ? `${Math.min(index, 8) * 80}ms` : undefined }}
          className={cn(
            "transition-[opacity,translate] duration-[700ms] ease-spring-soft",
            "group-data-[reveal=armed]/reveal:translate-y-6 group-data-[reveal=armed]/reveal:opacity-0",
            itemClassName
          )}
        >
          {child}
        </Item>
      ))}
    </Component>
  );
}
