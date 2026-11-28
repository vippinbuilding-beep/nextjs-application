"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";

import { usePointerVars } from "../lib/pointer-vars";
import { cn } from "../lib/utils";

/**
 * Superfície que inclina em 3D seguindo o mouse, com um reflexo de luz que
 * acompanha o cursor. Só transform/opacity (camada de GPU) e sem biblioteca:
 * a posição vem de `usePointerVars` e o amortecimento da mola em CSS.
 * No toque (e com movimento reduzido) fica parada; o "levantar" do hover
 * continua vindo do `group` do pai.
 *
 * `rounded` precisa ser o mesmo arredondamento do conteúdo (corta o reflexo).
 */
export function TiltSurface({
  children,
  className,
  rounded = "rounded-3xl",
  maxTilt = 7,
}: {
  children: ReactNode;
  className?: string;
  rounded?: string;
  /** Inclinação máxima em graus (nas bordas). */
  maxTilt?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  usePointerVars(ref);

  return (
    <span
      ref={ref}
      style={{ "--tilt": `${maxTilt * 2}deg` } as CSSProperties}
      className={cn(
        "relative block [transform:perspective(900px)_rotateX(calc(var(--py,0)*var(--tilt)*-1))_rotateY(calc(var(--px,0)*var(--tilt)))]",
        "transition-[transform,translate] duration-[420ms] ease-spring",
        className
      )}
    >
      {children}
      <span aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", rounded)}>
        <span className="absolute -inset-1/2 bg-[radial-gradient(circle_at_center,rgb(255_255_255/0.22),transparent_45%)] opacity-0 transition-[opacity,translate] duration-[420ms] ease-spring-soft [translate:calc(var(--px,0)*60%)_calc(var(--py,0)*60%)] group-hover:opacity-100" />
      </span>
    </span>
  );
}
