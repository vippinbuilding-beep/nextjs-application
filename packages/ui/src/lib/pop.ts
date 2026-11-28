/**
 * Pulo curto de destaque (badge que ganhou um item, ponto de alerta novo).
 * Web Animations API: roda no compositor, sem dependência e sem re-render.
 * Respeita quem pede menos movimento.
 */
const POP_SPRING =
  "linear(0, 0.094, 0.306, 0.551, 0.774, 0.945, 1.056, 1.112, 1.126, 1.113, 1.085, 1.054, 1.026, 1.006, 0.992, 0.986, 0.984, 0.986, 0.99, 0.993, 0.997, 1, 1.001, 1.002, 1)";

export function popElement(element: HTMLElement | null): void {
  if (!element || typeof element.animate !== "function") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const easing = CSS.supports("transition-timing-function", POP_SPRING) ? POP_SPRING : "ease-out";
  element.animate([{ transform: "scale(0.6)" }, { transform: "scale(1)" }], { duration: 520, easing });
}
