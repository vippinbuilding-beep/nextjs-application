/**
 * Money helpers. Prices are always stored as integer cents to avoid
 * floating-point rounding issues; formatting/parsing to BRL happens only at the
 * UI boundary.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formats a value in cents as Brazilian currency, e.g. 1990 -> "R$ 19,90". */
export function formatBRL(cents: number): string {
  return BRL.format((cents ?? 0) / 100);
}

/**
 * Parses a user-typed reais string into integer cents. Accepts inputs like
 * "19,90", "19.90", "R$ 1.234,56" or "1234". Returns 0 for empty/invalid input.
 */
export function parseReaisToCents(input: string): number {
  if (!input) return 0;

  let cleaned = input.replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  // The right-most separator is treated as the decimal separator; the other one
  // (if any) is a thousands separator and gets stripped.
  const decimalSep = lastComma > lastDot ? "," : lastDot > lastComma ? "." : "";

  if (decimalSep) {
    const thousandsSep = decimalSep === "," ? "." : ",";
    cleaned = cleaned.split(thousandsSep).join("");
    cleaned = cleaned.replace(decimalSep, ".");
  } else {
    cleaned = cleaned.replace(/[.,]/g, "");
  }

  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

/** Formats cents as a plain reais value for editing, e.g. 1990 -> "19,90". */
export function centsToReaisInput(cents: number): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
