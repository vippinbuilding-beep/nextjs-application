"use client";

import { ImageIcon, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface ImageOverlayPickerProps {
  id: string;
  accept?: string;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
  validate?: (file: File) => string | null;
  onValidationError?: (message: string | null) => void;
  /** Matches the preview shape (`circle` for avatars, `rounded` for link covers). */
  shape?: "circle" | "rounded";
  icon?: LucideIcon;
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
}

export function ImageOverlayPicker({
  id,
  accept,
  disabled = false,
  onFileChange,
  validate,
  onValidationError,
  shape = "rounded",
  icon: Icon = ImageIcon,
  ariaLabel = "Escolher imagem",
  className,
  children,
}: ImageOverlayPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const radiusClass = shape === "circle" ? "rounded-full" : "rounded-lg";

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

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    applyFile(event.target.files?.[0] ?? null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    applyFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        "group relative inline-flex cursor-pointer",
        disabled && "pointer-events-none opacity-50",
        dragging && "ring-2 ring-primary ring-offset-2",
        className
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={handleDrop}
    >
      {children}

      <span
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/55 opacity-0 transition-opacity",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          radiusClass
        )}
        aria-hidden
      >
        <Icon className="size-5 text-background drop-shadow-sm sm:size-6" />
      </span>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        aria-label={ariaLabel}
        onChange={handleInputChange}
      />
    </label>
  );
}
