/**
 * As mesmas springs do `globals.css` (`--spring-*`), em string, para
 * animações feitas com a Web Animations API (`element.animate`). Use
 * `springEasing` para cair num cubic-bezier em navegador sem `linear()`.
 */
export const CSS_SPRINGS = {
  snappy:
    "linear(0, 0.044, 0.149, 0.283, 0.424, 0.557, 0.676, 0.776, 0.855, 0.916, 0.961, 0.992, 1.011, 1.022, 1.027, 1.028, 1.027, 1.023, 1.02, 1.016, 1.012, 1.008, 1.006, 1.004, 1)",
  soft: "linear(0, 0.049, 0.157, 0.285, 0.411, 0.525, 0.624, 0.706, 0.772, 0.825, 0.866, 0.899, 0.924, 0.943, 0.957, 0.968, 0.976, 0.983, 0.987, 0.991, 0.993, 0.995, 0.996, 0.997, 1)",
  bouncy:
    "linear(0, 0.094, 0.306, 0.551, 0.774, 0.945, 1.056, 1.112, 1.126, 1.113, 1.085, 1.054, 1.026, 1.006, 0.992, 0.986, 0.984, 0.986, 0.99, 0.993, 0.997, 1, 1.001, 1.002, 1)",
} as const;

const FALLBACKS: Record<keyof typeof CSS_SPRINGS, string> = {
  snappy: "cubic-bezier(0.34, 1.3, 0.64, 1)",
  soft: "cubic-bezier(0.22, 1, 0.36, 1)",
  bouncy: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

export function springEasing(name: keyof typeof CSS_SPRINGS): string {
  return CSS.supports("transition-timing-function", CSS_SPRINGS[name])
    ? CSS_SPRINGS[name]
    : FALLBACKS[name];
}

/** `true` quando a pessoa pediu menos movimento no sistema. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
