interface AnimatedHeightProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Mantido pela API, mas sem animar a altura: animar `height` recalcula o
 * layout a cada frame e trava em aparelho fraco (regra do CLAUDE.md). O
 * conteúdo só troca de tamanho na hora.
 */
export function AnimatedHeight({ children, className }: AnimatedHeightProps) {
    return <div className={className}>{children}</div>;
}
