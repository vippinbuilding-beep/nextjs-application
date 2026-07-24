import type * as React from "react";
import DOMPurify from "isomorphic-dompurify";

import { isRichTextHtml } from "@vippin/core/domain/rich-text";
import { cn } from "../lib/utils";
import { richTextProseClassName } from "../lib/rich-text-styles";

/**
 * Tags e atributos aceitos na descrição. É o mesmo conjunto que o
 * `RichTextEditor` consegue produzir — qualquer coisa fora disso vem de HTML
 * adulterado no cliente e é descartada aqui, na hora de renderizar.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
  "hr",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

/** Sanitiza HTML de descrição vindo do banco. Seguro no servidor e no browser. */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Sem `javascript:` / `data:` em links.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
  });
}

interface RichTextContentProps {
  /** HTML do editor ou texto puro (descrições antigas). */
  value: string;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * Renderiza a descrição salva. Aceita tanto o HTML novo quanto as descrições
 * antigas em texto puro — nesse caso preserva as quebras de linha.
 */
export function RichTextContent({ value, className, ref }: RichTextContentProps) {
  if (!isRichTextHtml(value)) {
    return (
      <div ref={ref} className={cn("break-words whitespace-pre-line", className)}>
        {value}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(richTextProseClassName, className)}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
    />
  );
}

export { richTextProseClassName };
