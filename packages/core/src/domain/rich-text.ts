/**
 * Helpers puros para lidar com texto rico (HTML) guardado no banco.
 *
 * Descrições de produto eram texto puro e passaram a aceitar HTML gerado pelo
 * editor. Estas funções são backend-agnósticas e servem para: contar caracteres
 * "de verdade" (sem a marcação), gerar prévias em listas/cards e alimentar
 * metadados de SEO.
 *
 * Elas **não** sanitizam nada — a limpeza do HTML acontece na borda da UI
 * (`RichTextContent` em `@vippin/ui/rich-text-content`).
 */

const BLOCK_BOUNDARY =
  /<\/(p|div|li|h[1-6]|blockquote|pre|tr)>|<br\s*\/?>|<hr\s*\/?>/gi;

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const key = entity.toLowerCase();
    if (key.startsWith("#x")) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    if (key.startsWith("#")) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return HTML_ENTITIES[key] ?? match;
  });
}

/**
 * `true` quando o valor guardado é HTML do editor. Descrições antigas são texto
 * puro (podem conter `<` solto, por isso exigimos uma tag reconhecível).
 */
export function isRichTextHtml(value: string): boolean {
  return /<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i.test(value);
}

/**
 * Converte texto rico em texto puro, preservando as quebras entre blocos.
 * Também funciona para valores que já são texto puro (devolve o mesmo texto).
 */
export function richTextToPlainText(value: string | null | undefined): string {
  if (!value) return "";
  if (!isRichTextHtml(value)) return value;

  return decodeEntities(
    value
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(BLOCK_BOUNDARY, "\n")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Quantidade de caracteres visíveis — é isso que o usuário vê no contador. */
export function richTextLength(value: string | null | undefined): number {
  return richTextToPlainText(value).length;
}

/** `true` quando não sobra nenhum conteúdo visível (ex.: `<p></p>` do editor). */
export function isRichTextEmpty(value: string | null | undefined): boolean {
  return richTextLength(value) === 0;
}

/**
 * Prévia em uma linha para cards, feeds e metadados: sem marcação e sem quebras.
 */
export function richTextPreview(
  value: string | null | undefined,
  maxLength?: number
): string {
  const plain = richTextToPlainText(value).replace(/\s+/g, " ").trim();
  if (!maxLength || plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1).trimEnd()}…`;
}
