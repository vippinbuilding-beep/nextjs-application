"use client";

import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { richTextLength } from "@vippin/core/domain/rich-text";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "../lib/utils";
import { richTextProseClassName } from "../lib/rich-text-styles";

interface RichTextEditorProps {
  id?: string;
  /** HTML controlado. Aceita texto puro (descrições antigas). */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Limite de caracteres visíveis (sem contar a marcação). */
  maxLength?: number;
  className?: string;
  disabled?: boolean;
}

/** O editor guarda `<p></p>` quando está vazio; para o formulário isso é "". */
function normalizeHtml(editor: Editor): string {
  return editor.isEmpty ? "" : editor.getHTML();
}

interface ToolbarButtonProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({
  label,
  icon: Icon,
  active,
  disabled,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "default" : "ghost"}
      className="size-8 rounded-lg"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="size-4" />
    </Button>
  );
}

/**
 * Editor de texto rico (Tiptap) no visual cartoon do app. O valor é HTML e deve
 * ser renderizado com `RichTextContent` (`@vippin/ui/rich-text-content`), que
 * sanitiza a marcação.
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  className,
  disabled = false,
}: RichTextEditorProps) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");

  const editor = useEditor({
    // O conteúdo é renderizado só no cliente para não quebrar a hidratação.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-multiline": "true",
        class: cn(
          richTextProseClassName,
          "min-h-64 w-full px-3.5 py-3 text-base font-medium outline-none md:text-sm"
        ),
      },
      // O limite vale para o texto visível: bloqueia digitação e corta o colado.
      handleTextInput: (view, from, to, text) => {
        if (!maxLength) return false;
        const nextLength =
          view.state.doc.textBetween(0, view.state.doc.content.size, "\n").length -
          (to - from) +
          text.length;
        return nextLength > maxLength;
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(normalizeHtml(current));
    },
  });

  // Sincroniza quando o valor muda por fora (ex.: reset do formulário).
  React.useEffect(() => {
    if (!editor) return;
    if (value === normalizeHtml(editor)) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  React.useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-72 w-full rounded-xl border-2 border-border bg-background shadow-cartoon-sm",
          className
        )}
      />
    );
  }

  const plainLength = richTextLength(normalizeHtml(editor));
  const atLimit = Boolean(maxLength && plainLength >= maxLength);

  function openLinkDialog() {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const href = /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-xl border-2 border-border bg-background shadow-cartoon-sm transition-all",
          "focus-within:-translate-y-0.5 focus-within:shadow-cartoon",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <div className="flex flex-wrap items-center gap-1 border-b-2 border-border bg-muted/40 p-1.5">
          <ToolbarButton
            label="Negrito"
            icon={Bold}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Itálico"
            icon={Italic}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="Sublinhado"
            icon={UnderlineIcon}
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <ToolbarButton
            label="Tachado"
            icon={Strikethrough}
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />

          <span className="mx-0.5 h-6 w-0.5 shrink-0 bg-border" aria-hidden />

          <ToolbarButton
            label="Título"
            icon={Heading2}
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          />
          <ToolbarButton
            label="Subtítulo"
            icon={Heading3}
            active={editor.isActive("heading", { level: 3 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          />

          <span className="mx-0.5 h-6 w-0.5 shrink-0 bg-border" aria-hidden />

          <ToolbarButton
            label="Lista com marcadores"
            icon={List}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="Lista numerada"
            icon={ListOrdered}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            label="Citação"
            icon={Quote}
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />

          <span className="mx-0.5 h-6 w-0.5 shrink-0 bg-border" aria-hidden />

          <ToolbarButton
            label="Inserir link"
            icon={Link2}
            active={editor.isActive("link")}
            onClick={openLinkDialog}
          />
          <ToolbarButton
            label="Remover link"
            icon={Link2Off}
            disabled={!editor.isActive("link")}
            onClick={() =>
              editor.chain().focus().extendMarkRange("link").unsetLink().run()
            }
          />

          <span className="ml-auto flex items-center gap-1">
            <ToolbarButton
              label="Desfazer"
              icon={Undo2}
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
            />
            <ToolbarButton
              label="Refazer"
              icon={Redo2}
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
            />
          </span>
        </div>

        <div className="relative">
          {editor.isEmpty && placeholder && (
            <p className="text-muted-foreground pointer-events-none absolute left-3.5 top-3 text-base font-medium md:text-sm">
              {placeholder}
            </p>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>

      {maxLength && (
        <p
          className={cn(
            "text-muted-foreground text-right text-xs",
            atLimit && "text-destructive font-bold"
          )}
        >
          {plainLength}/{maxLength}
        </p>
      )}

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inserir link</DialogTitle>
            <DialogDescription>
              Cole o endereço para onde o texto selecionado deve levar. Deixe em
              branco para remover o link.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rich-text-link-url">Endereço</Label>
            <Input
              id="rich-text-link-url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://exemplo.com"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkOpen(false)}
            >
              Voltar
            </Button>
            <Button type="button" onClick={applyLink}>
              Salvar link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
