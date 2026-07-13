import type { DateRange } from "@vippin/core/repositories/admin-analytics-repository";

/**
 * Intervalo padrão dos módulos: últimos N dias até agora. `to` é exclusivo
 * (fim do dia atual), `from` é o início do dia N-1 dias atrás.
 */
export function lastNDaysRange(days: number): DateRange {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

/**
 * Lê o parâmetro `?range=7|30|90` (dias) da URL, com fallback para 30.
 */
export function rangeFromParam(value: string | string[] | undefined): {
  days: number;
  range: DateRange;
} {
  const raw = Array.isArray(value) ? value[0] : value;
  const days = raw === "7" || raw === "90" ? Number(raw) : 30;
  return { days, range: lastNDaysRange(days) };
}
