"use client";

import { useEffect, type RefObject } from "react";

/**
 * Escreve a posição do mouse dentro do elemento em `--px`/`--py` (de -0.5 a
 * 0.5), no máximo uma vez por frame, e volta a 0 quando o mouse sai. Quem
 * usa lê as variáveis em `transform` com transição CSS (o amortecimento vem
 * da mola do kit). Sem biblioteca e sem re-render do React.
 *
 * Só liga com mouse de verdade (`hover: hover` e `pointer: fine`) e quando a
 * pessoa não pediu menos movimento.
 */
export function usePointerVars(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
