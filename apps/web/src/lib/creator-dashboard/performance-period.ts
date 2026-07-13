import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isValid,
  parse,
  startOfDay,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const CREATOR_PERFORMANCE_DATE_FORMAT = "yyyy-MM-dd";
export const CREATOR_PERFORMANCE_DEFAULT_PERIOD_DAYS = 30;
export const CREATOR_PERFORMANCE_MAX_RANGE_DAYS = 366;

export const CREATOR_PERFORMANCE_PERIOD_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
] as const;

export type CreatorPerformancePeriodDays =
  (typeof CREATOR_PERFORMANCE_PERIOD_OPTIONS)[number]["value"];

export type CreatorPerformancePeriodKind = "preset" | "custom";

export interface CreatorPerformancePeriod {
  kind: CreatorPerformancePeriodKind;
  days: number;
  from: string;
  to: string;
  label: string;
  fromDate: Date;
  toDate: Date;
}

const ALLOWED_PERIOD_DAYS = new Set<number>(
  CREATOR_PERFORMANCE_PERIOD_OPTIONS.map((option) => option.value)
);

export function parseCreatorPerformancePeriodDays(
  raw: string | null | undefined
): CreatorPerformancePeriodDays {
  const parsed = Number(raw);
  if (ALLOWED_PERIOD_DAYS.has(parsed)) {
    return parsed as CreatorPerformancePeriodDays;
  }
  return CREATOR_PERFORMANCE_DEFAULT_PERIOD_DAYS;
}

export function parsePerformanceDateKey(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = parse(trimmed, CREATOR_PERFORMANCE_DATE_FORMAT, new Date());
  if (!isValid(date)) return null;

  return startOfDay(date);
}

export function formatPerformancePeriodLabel(from: Date, to: Date): string {
  return `${format(from, "dd/MM/yyyy", { locale: ptBR })} – ${format(to, "dd/MM/yyyy", { locale: ptBR })}`;
}

export function formatPerformancePeriodShortLabel(from: Date, to: Date): string {
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromLabel = format(from, sameYear ? "dd/MM" : "dd/MM/yy", {
    locale: ptBR,
  });
  const toLabel = format(to, "dd/MM/yy", { locale: ptBR });
  return `${fromLabel} – ${toLabel}`;
}

export function buildPresetPeriod(
  days: CreatorPerformancePeriodDays
): CreatorPerformancePeriod {
  const toDate = startOfDay(new Date());
  const fromDate = subDays(toDate, days - 1);

  return {
    kind: "preset",
    days,
    from: format(fromDate, CREATOR_PERFORMANCE_DATE_FORMAT),
    to: format(toDate, CREATOR_PERFORMANCE_DATE_FORMAT),
    label: `últimos ${days} dias`,
    fromDate,
    toDate,
  };
}

function parseCustomPeriod(
  fromRaw: string,
  toRaw: string
): CreatorPerformancePeriod | null {
  const fromDate = parsePerformanceDateKey(fromRaw);
  const toDate = parsePerformanceDateKey(toRaw);
  const today = startOfDay(new Date());

  if (!fromDate || !toDate) return null;
  if (fromDate > toDate) return null;
  if (toDate > today || fromDate > today) return null;

  const days = differenceInCalendarDays(toDate, fromDate) + 1;
  if (days < 1 || days > CREATOR_PERFORMANCE_MAX_RANGE_DAYS) return null;

  return {
    kind: "custom",
    days,
    from: format(fromDate, CREATOR_PERFORMANCE_DATE_FORMAT),
    to: format(toDate, CREATOR_PERFORMANCE_DATE_FORMAT),
    label: formatPerformancePeriodLabel(fromDate, toDate),
    fromDate,
    toDate,
  };
}

export function parseCreatorPerformancePeriod(params: {
  days?: string | null;
  from?: string | null;
  to?: string | null;
}): CreatorPerformancePeriod {
  const fromParam = params.from?.trim();
  const toParam = params.to?.trim();

  if (fromParam && toParam) {
    const custom = parseCustomPeriod(fromParam, toParam);
    if (custom) return custom;
  }

  return buildPresetPeriod(parseCreatorPerformancePeriodDays(params.days));
}

export function validateCustomPerformanceRange(
  from: Date | undefined,
  to: Date | undefined
): string | null {
  if (!from || !to) {
    return "Selecione a data inicial e a final.";
  }

  const fromDate = startOfDay(from);
  const toDate = startOfDay(to);
  const today = startOfDay(new Date());

  if (fromDate > toDate) {
    return "A data inicial deve ser anterior à final.";
  }
  if (toDate > today) {
    return "O período não pode incluir datas futuras.";
  }

  const days = differenceInCalendarDays(toDate, fromDate) + 1;
  if (days > CREATOR_PERFORMANCE_MAX_RANGE_DAYS) {
    return `O período pode ter no máximo ${CREATOR_PERFORMANCE_MAX_RANGE_DAYS} dias.`;
  }

  return null;
}

export function buildCreatorPerformanceApiQuery(
  period: CreatorPerformancePeriod
): string {
  if (period.kind === "preset") {
    return `days=${period.days}`;
  }
  return `from=${period.from}&to=${period.to}`;
}

export function buildCreatorPerformanceSearchParams(
  period: CreatorPerformancePeriod
): URLSearchParams {
  const params = new URLSearchParams();
  if (period.kind === "preset") {
    params.set("days", String(period.days));
    return params;
  }
  params.set("from", period.from);
  params.set("to", period.to);
  return params;
}

export function getPerformancePeriodBounds(period: CreatorPerformancePeriod): {
  since: string;
  until: string;
} {
  return {
    since: period.fromDate.toISOString(),
    until: endOfDay(period.toDate).toISOString(),
  };
}

export function buildDayKeysBetween(fromDate: Date, toDate: Date): string[] {
  const keys: string[] = [];
  let current = startOfDay(fromDate);
  const end = startOfDay(toDate);

  while (current <= end) {
    keys.push(format(current, CREATOR_PERFORMANCE_DATE_FORMAT));
    current = addDays(current, 1);
  }

  return keys;
}
