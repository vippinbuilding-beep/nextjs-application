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

/**
 * Shows a clamped preview of long text with a "Mostrar mais"/"Mostrar menos"
 * toggle. The height animates smoothly between the collapsed and full state so
 * expanding/collapsing doesn't jump.
 */
export function ExpandableText({
  text,
  previewLength = 220,
  className,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > previewLength;
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const [heights, setHeights] = useState<{ collapsed: number; full: number } | null>(
    null
  );
  const [measuring, setMeasuring] = useState(isLong);

  const lines = collapsedLineCount(previewLength);

  // Measure the collapsed (N lines) and full heights before paint so the
  // preview never flashes fully expanded on mount. Start with max-height: 0
  // (hidden) so no flash occurs, then measure and reveal.
  useLayoutEffect(() => {
    const el = paragraphRef.current;
    if (!el || !isLong) {
      setHeights(null);
      setMeasuring(false);
      return;
    }
    const full = el.scrollHeight;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const collapsed = Math.min(full, Math.round(lineHeight * lines));
    setHeights({ collapsed, full });
    setMeasuring(false);
  }, [isLong, lines, text]);

  const maxHeight =
    !isLong || !heights || measuring
      ? measuring
        ? "0px"
        : undefined
      : expanded
        ? heights.full
        : heights.collapsed;

  return (
    <div className={className}>
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={maxHeight !== undefined ? { maxHeight } : undefined}
      >
        <p ref={paragraphRef} className="break-words whitespace-pre-line">
          {text}
        </p>
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 inline-block font-bold text-foreground underline underline-offset-2 hover:opacity-80"
        >
          {expanded ? "Mostrar menos" : "Mostrar mais"}
        </button>
      )}
    </div>
  );
}
