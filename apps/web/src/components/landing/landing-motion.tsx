"use client";

import {
  Children,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "@vippin/ui/lib/utils";

/**
 * Movimento da landing sem biblioteca (CSS + um pouco de JS): no Turbopack,
 * importar o Motion de forma estática numa página custa ~55 KB. Aqui tudo
 * roda com transições CSS (springs do kit) e variáveis CSS:
 * - efeitos de mouse só com ponteiro fino (desktop);
 * - nada de setState por frame (só variáveis CSS, uma vez por frame);
 * - quem pede menos movimento vê tudo parado.
 * A única peça com Motion é a vitrine do hero, carregada sob demanda.
 */

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasFinePointer(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Escreve a posição do mouse dentro do elemento em `--px`/`--py` (de -0.5 a
 * 0.5), no máximo uma vez por frame. Volta a 0 quando o mouse sai. Os filhos
 * usam as variáveis em `transform` com transição (o "amortecimento").
 */
export function usePointerVars(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !hasFinePointer() || prefersReducedMotion()) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const write = () => {
      frame = 0;
      element.style.setProperty("--px", x.toFixed(3));
      element.style.setProperty("--py", y.toFixed(3));
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = element.getBoundingClientRect();
      x = (event.clientX - rect.left) / rect.width - 0.5;
      y = (event.clientY - rect.top) / rect.height - 0.5;
      if (!frame) frame = requestAnimationFrame(write);
    };
    const onLeave = () => {
      x = 0;
      y = 0;
      if (!frame) frame = requestAnimationFrame(write);
    };

    element.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
    };
  }, [ref]);
}

/**
 * Gradientes `closest-side`: cada mancha chega a transparente antes da borda
 * da camada, então ela pode se mover sem mostrar corte reto.
 */
const MOVING_GLOW = [
  "radial-gradient(closest-side at 26% 44%, var(--glow-1), transparent)",
  "radial-gradient(closest-side at 44% 66%, var(--glow-2), transparent)",
  "radial-gradient(closest-side at 16% 74%, var(--glow-3), transparent)",
].join(", ");

/**
 * Brilho aurora que segue o mouse (lê `--px`/`--py` de um ancestral com
 * `usePointerVars`). Só transform, com a mola suave do kit.
 */
export function PointerGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      style={{ backgroundImage: MOVING_GLOW }}
      className={cn(
        "pointer-events-none absolute inset-0",
        "translate-x-[calc(var(--px,0)*16%)] translate-y-[calc(var(--py,0)*16%)] transition-transform duration-[900ms] ease-spring-soft",
        className
      )}
    />
  );
}

/**
 * Botão "magnético": puxa levemente na direção do mouse quando ele passa
 * por cima. Só desktop; no toque fica parado.
 */
export function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  usePointerVars(ref);
  return (
    <div
      ref={ref}
      className="w-full translate-x-[calc(var(--px,0)*28px)] translate-y-[calc(var(--py,0)*20px)] transition-transform duration-[420ms] ease-spring sm:w-auto"
    >
      {children}
    </div>
  );
}

/**
 * Revela os filhos em cascata quando entram na tela, uma vez só. Só "arma"
 * (esconde) o que está abaixo da dobra no carregamento: o que já está na
 * tela, ou sem JS, aparece pronto.
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
    if (!element || prefersReducedMotion()) return;
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
          style={{ transitionDelay: state === "revealed" ? `${index * 80}ms` : undefined }}
          className={cn(
            "transition-[opacity,transform] duration-[700ms] ease-spring-soft",
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

/**
 * Barra que se desenha com a rolagem: animação ligada à rolagem do próprio
 * CSS (roda no compositor, sem JS por frame). O ancestral define o
 * `view-timeline-name`; sem suporte, a barra já aparece cheia.
 */
export function scrollDrawStyle(timeline: string, start: number, end: number): CSSProperties {
  return {
    animation: "scroll-draw-x linear both",
    animationTimeline: timeline,
    animationRange: `cover ${start}% cover ${end}%`,
  } as CSSProperties;
}

export function scrollLightStyle(timeline: string, at: number): CSSProperties {
  return {
    animation: "scroll-light linear both",
    animationTimeline: timeline,
    animationRange: `cover ${at - 4}% cover ${at}%`,
  } as CSSProperties;
}

/** Navbar que some ao descer e volta ao subir. Estado só muda na troca de direção. */
export function useHideOnScroll(threshold = 160): { scrolled: boolean; hidden: boolean } {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const check = () => {
      frame = 0;
      const current = window.scrollY;
      setScrolled(current > 8);
      setHidden(current > threshold && current > last);
      last = current;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return { scrolled, hidden };
}
