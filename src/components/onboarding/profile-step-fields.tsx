"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import type { OnboardingFormData } from "./types";
import { ONBOARDING_LIMITS } from "./validation";

interface ProfileStepFieldsProps {
  data: OnboardingFormData;
  onChange: (field: keyof Omit<OnboardingFormData, "socials">, value: string) => void;
}

const DATE_FORMAT = "yyyy-MM-dd";

function parseBirthDate(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, DATE_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function ProfileStepFields({ data, onChange }: ProfileStepFieldsProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseBirthDate(data.birthDate);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Como você se chama?</Label>
        <Input
          id="name"
          type="text"
          placeholder="Seu nome completo"
          value={data.name}
          onChange={(e) => onChange("name", e.target.value)}
          minLength={ONBOARDING_LIMITS.name.min}
          maxLength={ONBOARDING_LIMITS.name.max}
          autoComplete="name"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="creatorName">Como você é conhecido?</Label>
        <Input
          id="creatorName"
          type="text"
          placeholder="Seu @ ou nome público"
          value={data.creatorName}
          onChange={(e) => onChange("creatorName", e.target.value)}
          minLength={ONBOARDING_LIMITS.creatorName.min}
          maxLength={ONBOARDING_LIMITS.creatorName.max}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="birthDate">Data de Nascimento</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="birthDate"
              type="button"
              variant="outline"
              className={cn(
                "h-10 w-full justify-between font-medium",
                !selectedDate && "text-muted-foreground"
              )}
            >
              {selectedDate
                ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                : "Selecione uma data"}
              <CalendarIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              locale={ptBR}
              captionLayout="dropdown"
              defaultMonth={selectedDate}
              endMonth={new Date()}
              disabled={{ after: new Date() }}
              selected={selectedDate}
              onSelect={(date) => {
                onChange("birthDate", date ? format(date, DATE_FORMAT) : "");
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pixKey">Chave PIX (para pagamentos)</Label>
        <Input
          id="pixKey"
          type="text"
          autoCapitalize="characters"
          placeholder="CPF ou CNPJ"
          value={data.pixKey}
          onChange={(e) => onChange("pixKey", e.target.value)}
          minLength={ONBOARDING_LIMITS.pixKey.min}
          maxLength={ONBOARDING_LIMITS.pixKey.max}
          autoComplete="off"
          required
        />
        <p className="text-muted-foreground text-xs">
          Confira com atenção: seus pagamentos serão enviados para esta chave. Se
          estiver incorreta, o dinheiro não será reembolsado.
        </p>
      </div>

    </>
  );
}
