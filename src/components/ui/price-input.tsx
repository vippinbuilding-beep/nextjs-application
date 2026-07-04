"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PriceInputProps {
  id?: string;
  /** Current value in integer cents (e.g. 1990 = R$ 19,90). */
  valueCents: number;
  onChangeCents: (cents: number) => void;
  /** Caps typed input so the value never exceeds this many cents. */
  maxCents?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Currency input for BRL values. Formats as reais/centavos in real time as
 * the user types (digits fill in from the right, like most Brazilian money
 * inputs), always exposing/receiving integer cents to avoid floating-point
 * rounding issues.
 */
export function PriceInput({
  id,
  valueCents,
  onChangeCents,
  maxCents,
  placeholder = "0,00",
  className,
  disabled,
}: PriceInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  const displayValue = valueCents
    ? (valueCents / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const cents = digits ? Number(digits) : 0;
    onChangeCents(
      maxCents !== undefined ? Math.min(cents, maxCents) : cents
    );
  }

  return (
    <div className="relative transition-all focus-within:-translate-y-0.5">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-sm font-bold">
        R$
      </span>
      <Input
        id={inputId}
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        // Movement on focus is handled by the wrapper above (so the "R$"
        // icon moves together with the input); only keep the input's own
        // focus shadow here.
        className={cn("pl-10 focus-visible:translate-y-0", className)}
      />
    </div>
  );
}
