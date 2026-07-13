export const backgroundColors = {
    default: "var(--background)",
    primary: "var(--primary)",
} as const;

export type TypeBackground = keyof typeof backgroundColors;

export interface LayoutBackgroundProps {
    children: React.ReactNode;
    className?: string;
    element?: "main" | "section" | "div";
    background?: TypeBackground;
    /** Opacidade da camada de pontinhos (0 a 1). Padrão: 1. */
    dotsOpacity?: number;
}
