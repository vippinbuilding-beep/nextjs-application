"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";

import { Button } from "@vippin/ui/button";
import { Calendar } from "@vippin/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@vippin/ui/popover";

import { formatDateParam, lastNDaysRange } from "@/lib/dashboard/range";

const PRESETS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

function formatShort(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export interface DateRangePickerProps {
  from: Date;
  to: Date;
}

/**
 * Seletor de período dos gráficos: presets rápidos (7/30/90 dias) + calendário
 * para um intervalo personalizado. Navega via `?from=YYYY-MM-DD&to=YYYY-MM-DD`
 * na URL, preservando os demais query params da página.
 */
export function DateRangePicker({ from, to }: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [customOpen, setCustomOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DayPickerRange | undefined>({
    from,
    to,
  });

  function pushRange(nextFrom: Date, nextTo: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", formatDateParam(nextFrom));
    params.set("to", formatDateParam(nextTo));
    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePreset(days: number) {
    setCustomOpen(false);
    const range = lastNDaysRange(days);
    pushRange(range.from, range.to);
  }

  function handleApplyCustom() {
    if (!draftRange?.from || !draftRange?.to) return;
    setCustomOpen(false);
    pushRange(draftRange.from, draftRange.to);
  }

  const activePresetDays = PRESETS.find((p) => {
    const preset = lastNDaysRange(p.days);
    return (
      formatDateParam(preset.from) === formatDateParam(from) &&
      formatDateParam(preset.to) === formatDateParam(to)
    );
  })?.days;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Período">
      {PRESETS.map((preset) => (
        <Button
          key={preset.days}
          type="button"
          size="sm"
          variant={activePresetDays === preset.days ? "default" : "outline"}
          aria-pressed={activePresetDays === preset.days}
          onClick={() => handlePreset(preset.days)}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant={activePresetDays === undefined ? "default" : "outline"}
            aria-pressed={activePresetDays === undefined}
            className="gap-1.5"
          >
            <span>
              {activePresetDays === undefined
                ? `${formatShort(from)} – ${formatShort(to)}`
                : "Personalizado"}
            </span>
            <CalendarIcon className="size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col gap-3 p-3">
            <div>
              <p className="text-sm font-bold">Intervalo personalizado</p>
              <p className="text-muted-foreground text-xs">
                Escolha a data inicial e a final.
              </p>
            </div>

            <Calendar
              mode="range"
              numberOfMonths={1}
              defaultMonth={draftRange?.from ?? from}
              disabled={{ after: new Date() }}
              selected={draftRange}
              onSelect={setDraftRange}
            />

            {draftRange?.from && (
              <p className="text-muted-foreground text-xs font-medium">
                {draftRange.to
                  ? `${formatShort(draftRange.from)} – ${formatShort(draftRange.to)}`
                  : `${formatShort(draftRange.from)} – selecione a data final`}
              </p>
            )}

            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!draftRange?.from || !draftRange?.to}
              onClick={handleApplyCustom}
            >
              Aplicar período
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
