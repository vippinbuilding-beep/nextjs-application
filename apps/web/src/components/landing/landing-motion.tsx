"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { usePointerVars } from "@vippin/ui/lib/pointer-vars";
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
