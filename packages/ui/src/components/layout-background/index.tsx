import { cn } from "../../lib/utils";
import { LayoutBackgroundProps, backgroundColors } from "./types";


export function LayoutBackground({
    children,
    className,
    element = "main",
    background = "default",
    dotsOpacity = 1,
}: LayoutBackgroundProps) {
    const Element = element;
    return (
        <Element
            className={cn("relative isolate min-h-svh", className)}
            style={{ backgroundColor: backgroundColors[background] }}
        >
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--border)_1.5px,transparent_1.5px)] bg-size-[24px_24px]"
                style={{ opacity: dotsOpacity }}
            />
            {children}
        </Element>
    );
}
