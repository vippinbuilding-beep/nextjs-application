"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@vippin/ui/button";
import { Calendar } from "@vippin/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@vippin/ui/popover";
import {
  buildCreatorPerformanceSearchParams,
  buildPresetPeriod,
  CREATOR_PERFORMANCE_DATE_FORMAT,
  CREATOR_PERFORMANCE_PERIOD_OPTIONS,
  formatPerformancePeriodShortLabel,
  parseCreatorPerformancePeriod,
  parsePerformanceDateKey,
  type CreatorPerformancePeriod,
  type CreatorPerformancePeriodDays,
  validateCustomPerformanceRange,
} from "@/lib/creator-dashboard/performance-period";
import { cn } from "@vippin/ui/lib/utils";

interface PerformancePeriodPickerProps {
  period: CreatorPerformancePeriod;
  onPeriodChange: (params: URLSearchParams) => void;
  disabled?: boolean;
}

export function PerformancePeriodPicker({
  period,
  onPeriodChange,
  disabled,
}: PerformancePeriodPickerProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() =>
    period.kind === "custom"
      ? { from: period.fromDate, to: period.toDate }
      : undefined
  );
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (period.kind === "custom") {
      setDraftRange({ from: period.fromDate, to: period.toDate });
    }
  }, [period]);

  function handlePresetSelect(days: CreatorPerformancePeriodDays) {
    setCustomError(null);
    setCustomOpen(false);
    onPeriodChange(buildCreatorPerformanceSearchParams(buildPresetPeriod(days)));
  }

  function handleApplyCustomRange() {
    const validationError = validateCustomPerformanceRange(
      draftRange?.from,
      draftRange?.to
    );
    if (validationError) {
      setCustomError(validationError);
      return;
    }

    const from = format(draftRange!.from!, CREATOR_PERFORMANCE_DATE_FORMAT);
    const to = format(draftRange!.to!, CREATOR_PERFORMANCE_DATE_FORMAT);
    const nextPeriod = parseCreatorPerformancePeriod({ from, to });

    if (nextPeriod.kind !== "custom") {
      setCustomError("Período inválido.");
      return;
    }

    setCustomError(null);
    setCustomOpen(false);
    onPeriodChange(buildCreatorPerformanceSearchParams(nextPeriod));
  }

  const customButtonLabel =
    period.kind === "custom"
      ? formatPerformancePeriodShortLabel(period.fromDate, period.toDate)
      : "Personalizado";

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Período do desempenho"
    >
      {CREATOR_PERFORMANCE_PERIOD_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={
            period.kind === "preset" && period.days === option.value
              ? "default"
              : "outline"
          }
          disabled={disabled}
          aria-pressed={period.kind === "preset" && period.days === option.value}
          onClick={() => handlePresetSelect(option.value)}
        >
          {option.label}
        </Button>
      ))}

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant={period.kind === "custom" ? "default" : "outline"}
            disabled={disabled}
            aria-pressed={period.kind === "custom"}
            className={cn(period.kind === "custom" && "max-w-[11rem] truncate")}
          >
            <span className="truncate">{customButtonLabel}</span>
            <CalendarIcon className="size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col gap-3 p-3">
            <div className="space-y-1">
              <p className="text-sm font-bold">Intervalo personalizado</p>
              <p className="text-muted-foreground text-xs">
                Escolha a data inicial e a final no calendário.
              </p>
            </div>

            <Calendar
              mode="range"
              locale={ptBR}
              numberOfMonths={1}
              defaultMonth={
                draftRange?.from ??
                parsePerformanceDateKey(period.from) ??
                period.fromDate
              }
              disabled={{ after: new Date() }}
              selected={draftRange}
              onSelect={(range) => {
                setDraftRange(range);
                setCustomError(null);
              }}
            />

            {draftRange?.from && (
              <p className="text-muted-foreground text-xs font-medium">
                {draftRange.to
                  ? `${format(draftRange.from, "dd/MM/yyyy", { locale: ptBR })} – ${format(draftRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                  : `${format(draftRange.from, "dd/MM/yyyy", { locale: ptBR })} – selecione a data final`}
              </p>
            )}

            {customError && (
              <p className="text-destructive text-xs font-medium" role="alert">
                {customError}
              </p>
            )}

            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!draftRange?.from || !draftRange?.to || disabled}
              onClick={handleApplyCustomRange}
            >
              Aplicar período
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
