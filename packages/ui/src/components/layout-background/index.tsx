import { cn } from "../../lib/utils";
import { LayoutBackgroundProps } from "./types";

/**
 * Fundo padrão das páginas: cor de fundo do tema + grade fina. `primary`
 * (telas de destaque, ex.: onboarding) soma um brilho suave do espectro.
 * Tudo estático (sem animação), então não custa nada depois de pintado.
 */
export function LayoutBackground({
    children,
    className,
    element = "main",
    background = "default",
    dotsOpacity = 1,
}: LayoutBackgroundProps) {
    const Element = element;
    return (
        <Element className={cn("relative isolate min-h-svh bg-background", className)}>
            {background === "primary" && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(110%_70%_at_85%_0%,rgb(167_139_250/0.28),transparent_60%),radial-gradient(80%_60%_at_0%_100%,rgb(255_79_163/0.16),transparent_60%),radial-gradient(60%_50%_at_50%_50%,rgb(255_229_2/0.12),transparent_70%)]"
                />
            )}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(var(--grid)_1px,transparent_1px),linear-gradient(90deg,var(--grid)_1px,transparent_1px)] bg-size-[48px_48px]"
                style={{ opacity: dotsOpacity }}
            />
            {children}
        </Element>
    );
}
