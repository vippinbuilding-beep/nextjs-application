"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

import { prefersReducedMotion, springEasing } from "./css-springs";

/**
 * Lista que se reordena deslizando (técnica FLIP, sem biblioteca): chame a
 * função devolvida logo antes de mudar a ordem no estado; depois do render,
 * cada item com `data-flip-id` anima da posição antiga para a nova só com
 * transform. Movimento reduzido: troca na hora.
 */
export function useFlipList(containerRef: RefObject<HTMLElement | null>): () => void {
  const snapshot = useRef<Map<string, DOMRect> | null>(null);

  useLayoutEffect(() => {
    const before = snapshot.current;
    const container = containerRef.current;
    if (!before || !container) return;
    snapshot.current = null;
    if (prefersReducedMotion()) return;

    const easing = springEasing("snappy");
    container.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((element) => {
      const previous = before.get(element.dataset.flipId ?? "");
      if (!previous || typeof element.animate !== "function") return;
      const current = element.getBoundingClientRect();
      const dx = previous.left - current.left;
      const dy = previous.top - current.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      element.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: 460, easing }
      );
    });
  });

  return () => {
    const container = containerRef.current;
    if (!container) return;
    const rects = new Map<string, DOMRect>();
    container.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((element) => {
      if (element.dataset.flipId) rects.set(element.dataset.flipId, element.getBoundingClientRect());
    });
    snapshot.current = rects;
  };
}
