"use client";

import { useState } from "react";

import { cn } from "@vippin/ui/lib/utils";

interface ExpandableTextProps {
  text: string;
  /** Characters shown before truncating and offering "Mostrar mais". */
  previewLength?: number;
  className?: string;
}

/**
 * Shows a truncated preview of long text with a "Mostrar mais"/"Mostrar menos"
 * toggle, so long descriptions don't dominate the page by default.
 */
export function ExpandableText({
  text,
  previewLength = 220,
  className,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > previewLength;
  const preview = isLong ? `${text.slice(0, previewLength).trimEnd()}…` : text;

  return (
    <p className={cn("break-all", className)}>
      {expanded || !isLong ? text : preview}
      {isLong && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-foreground font-bold underline underline-offset-2 hover:opacity-80"
          >
            {expanded ? "Mostrar menos" : "Mostrar mais"}
          </button>
        </>
      )}
    </p>
  );
}
