import type { DateRange } from "@vippin/core/repositories/admin-analytics-repository";

export const DATE_PARAM_FORMAT = "yyyy-MM-dd";

/** Intervalo padrão: últimos N dias até agora (fim do dia atual, inclusive). */
export function lastNDaysRange(days: number): DateRange {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function parseDateParam(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Resolve o intervalo de datas a partir de `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
 * Sem esses parâmetros, cai no preset de 30 dias. Datas inválidas também
 * caem no preset (fail-safe).
 */
export function rangeFromSearchParams(sp: {
  from?: string;
  to?: string;
}): DateRange {
  const fromDate = parseDateParam(sp.from);
  const toDate = parseDateParam(sp.to);

  if (!fromDate || !toDate || fromDate > toDate) {
    return lastNDaysRange(30);
  }

  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);
  return { from: fromDate, to: toDate };
}
