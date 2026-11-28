import { cn } from "../../lib/utils";
import { LayoutBackgroundProps } from "./types";

/**
 * Fundo padrão das páginas: só a cor de fundo do tema (Espectro 2 é limpo).
 * `primary` (telas de destaque, ex.: onboarding) soma o brilho da aurora; a
 * grade fina é opcional (`grid`). Tudo estático, sem custo depois de pintado.
 */
export function LayoutBackground({
    children,
    className,
    element = "main",
    background = "default",
    dotsOpacity = 1,
    grid = false,
}: LayoutBackgroundProps) {
    const Element = element;
    return (
        <Element className={cn("relative isolate min-h-svh bg-background", className)}>
            {background === "primary" && (
                <div aria-hidden className="aurora-glow pointer-events-none absolute inset-0 -z-10" />
            )}
            {grid && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(var(--grid)_1px,transparent_1px),linear-gradient(90deg,var(--grid)_1px,transparent_1px)] bg-size-[48px_48px]"
                    style={{ opacity: dotsOpacity }}
                />
            )}
            {children}
        </Element>
    );
}
