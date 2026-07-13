"use client";

import {
  CheckCircle2,
  FileIcon,
  ImageIcon,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@vippin/ui/button";
import { formatFileSize } from "@/lib/products";
import { cn } from "@vippin/ui/lib/utils";

export interface FileUploadFieldProps {
  id: string;
  accept?: string;
  disabled?: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  validate?: (file: File) => string | null;
  onValidationError?: (message: string | null) => void;
  /** Shown below the zone (formats, max size, etc.). */
  hint?: string;
  /** Primary line when empty. */
  title?: string;
  /** Secondary line when empty. */
  description?: string;
  /** Existing file name in edit flows (no new file selected yet). */
  existingFileName?: string | null;
  icon?: LucideIcon;
  preview?: React.ReactNode;
  className?: string;
}

export function FileUploadField({
  id,
  accept,
  disabled = false,
  file,
  onFileChange,
  validate,
  onValidationError,
  hint,
  title = "Escolher arquivo",
  description = "Clique aqui ou arraste o arquivo para esta área",
  existingFileName,
  icon: Icon = UploadCloud,
  preview,
  className,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const hasSelection = Boolean(file);
  const hasExisting = Boolean(existingFileName) && !file;
  const displayName = file?.name ?? existingFileName ?? "";
  const displaySize = file ? formatFileSize(file.size) : null;

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function applyFile(selected: File | null) {
    if (!selected) {
      onFileChange(null);
      onValidationError?.(null);
      return;
    }

    const validationError = validate?.(selected) ?? null;
    if (validationError) {
      onValidationError?.(validationError);
      onFileChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    onValidationError?.(null);
    onFileChange(selected);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    applyFile(e.target.files?.[0] ?? null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    applyFile(e.dataTransfer.files?.[0] ?? null);
  }

  function handleClear() {
    onFileChange(null);
    onValidationError?.(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn("flex gap-3", preview && "items-start")}>
        {preview}

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            disabled={disabled}
            className="sr-only"
            onChange={handleInputChange}
          />

          {hasSelection || hasExisting ? (
            <div className="flex flex-col gap-2 rounded-xl border-2 border-border bg-muted/30 p-3 shadow-cartoon-sm">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-background">
                  {hasSelection ? (
                    <CheckCircle2 className="size-5 text-primary" />
                  ) : (
                    <FileIcon className="size-5 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  {displaySize && (
                    <p className="text-muted-foreground text-xs">{displaySize}</p>
                  )}
                  {hasExisting && (
                    <p className="text-muted-foreground text-xs">
                      Arquivo atual. Escolha outro para substituir.
                    </p>
                  )}
                  {hasSelection && (
                    <p className="text-muted-foreground text-xs">
                      Novo arquivo selecionado.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={openPicker}
                >
                  <UploadCloud className="size-4" />
                  Trocar
                </Button>
                {hasSelection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={handleClear}
                  >
                    <X className="size-4" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={openPicker}
              onDragEnter={(e) => {
                e.preventDefault();
                if (!disabled) setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragging(false);
              }}
              onDrop={handleDrop}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center shadow-cartoon-sm transition-all",
                "hover:border-primary hover:bg-primary/5",
                "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-50",
                dragging && "border-primary bg-primary/10"
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm">
                <Icon className="size-6 text-muted-foreground" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-bold">{title}</span>
                <span className="text-muted-foreground text-xs">{description}</span>
              </span>
            </button>
          )}
        </div>
      </div>

      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

/** Image-oriented preset for thumbnails and covers. */
export function ImageUploadField({
  icon = ImageIcon,
  title = "Escolher imagem",
  description = "Clique ou arraste uma imagem aqui",
  ...props
}: Omit<FileUploadFieldProps, "icon" | "title" | "description"> & {
  icon?: LucideIcon;
  title?: string;
  description?: string;
}) {
  return (
    <FileUploadField
      icon={icon}
      title={title}
      description={description}
      {...props}
    />
  );
}
