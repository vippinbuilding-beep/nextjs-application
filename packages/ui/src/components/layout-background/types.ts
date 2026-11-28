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
    /** Mostra a grade fina de fundo. Padrão: desligada. */
    grid?: boolean;
    /** Opacidade da grade (0 a 1), quando `grid`. Padrão: 1. */
    dotsOpacity?: number;
}
