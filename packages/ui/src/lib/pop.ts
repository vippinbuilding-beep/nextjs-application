import { prefersReducedMotion, springEasing } from "./css-springs";

/**
 * Pulo curto de destaque (badge que ganhou um item, ponto de alerta novo).
 * Web Animations API: roda no compositor, sem dependência e sem re-render.
 * Respeita quem pede menos movimento.
 */

export function popElement(element: HTMLElement | null): void {
  if (!element || typeof element.animate !== "function") return;
  if (prefersReducedMotion()) return;
  element.animate([{ transform: "scale(0.6)" }, { transform: "scale(1)" }], {
    duration: 520,
    easing: springEasing("bouncy"),
  });
}
