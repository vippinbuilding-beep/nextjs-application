"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface ExpandableTextProps {
  text: string;
  /** Characters shown before truncating and offering "Mostrar mais". */
  previewLength?: number;
  className?: string;
}

/** Roughly turn the character threshold into a collapsed line count. */
function collapsedLineCount(previewLength: number): number {
  return Math.max(2, Math.round(previewLength / 55));
}

/** Mesma curva do `--spring-soft` (sem passar do ponto: é texto). */
const SOFT_SPRING =
  "linear(0, 0.049, 0.157, 0.285, 0.411, 0.525, 0.624, 0.706, 0.772, 0.825, 0.866, 0.899, 0.924, 0.943, 0.957, 0.968, 0.976, 0.983, 0.987, 0.991, 0.993, 0.995, 0.996, 0.997, 1)";

/**
 * Prévia de texto longo com "Mostrar mais"/"Mostrar menos".
 *
 * Fechado, o texto é cortado em N linhas pelo próprio CSS (`line-clamp`):
 * aparece pronto no HTML do servidor, sem esperar JS. Ao abrir/fechar, a
 * altura anima com mola (Web Animations API); é conteúdo pequeno, então
 * animar a altura não pesa. Movimento reduzido: troca na hora.
 */
export function ExpandableText({
  text,
  previewLength = 220,
  className,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > previewLength;
  const lines = collapsedLineCount(previewLength);
  const boxRef = useRef<HTMLDivElement>(null);
  const fromHeight = useRef<number | null>(null);

  const toggle = () => {
    fromHeight.current = boxRef.current?.getBoundingClientRect().height ?? null;
    setExpanded((value) => !value);
  };

  // Depois da troca (antes de pintar): anima da altura antiga para a nova.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const from = fromHeight.current;
    fromHeight.current = null;
    if (!box || from === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = box.getBoundingClientRect().height;
    if (Math.abs(to - from) < 1 || typeof box.animate !== "function") return;
    const easing = CSS.supports("transition-timing-function", SOFT_SPRING) ? SOFT_SPRING : "ease-out";
    box.animate(
      [
        { height: `${from}px`, overflow: "hidden" },
        { height: `${to}px`, overflow: "hidden" },
      ],
      { duration: expanded ? 420 : 320, easing }
    );
  }, [expanded]);

  return (
    <div className={className}>
      <div ref={boxRef}>
        <p
          className="break-words whitespace-pre-line"
          style={
            isLong && !expanded
              ? {
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: lines,
                  overflow: "hidden",
                }
              : undefined
          }
        >
          {text}
        </p>
      </div>
      {isLong && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="mt-1 inline-block font-semibold text-foreground underline underline-offset-2 hover:opacity-80"
        >
          {expanded ? "Mostrar menos" : "Mostrar mais"}
        </button>
      )}
    </div>
  );
}
