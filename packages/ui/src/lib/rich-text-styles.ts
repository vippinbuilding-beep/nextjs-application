import { cn } from "./utils";

/**
 * Estilos do conteúdo formatado (descrições em texto rico). Não usamos o plugin
 * `typography` do Tailwind, então cada elemento é estilizado por seletor com os
 * tokens do design.
 *
 * Fica isolado num módulo sem dependências para poder ser usado tanto pelo
 * editor (client) quanto pelo renderizador (server).
 */
export const richTextProseClassName = cn(
  "break-words",
  "[&_p]:my-0 [&_p+p]:mt-3",
  "[&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through",
  // Os títulos precisam se distinguir do corpo à primeira vista — senão parece
  // que o botão de título não fez nada.
  "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:font-bold [&_h2]:text-foreground",
  "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-xl [&_h3]:leading-snug [&_h3]:font-bold [&_h3]:text-foreground",
  "[&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1 [&_li]:pl-1",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic",
  "[&_a]:font-bold [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80",
  "[&_code]:rounded [&_code]:border-2 [&_code]:border-border [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_code]:font-bold",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border-2 [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-3",
  "[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_hr]:my-4 [&_hr]:border-t-2 [&_hr]:border-border"
);
