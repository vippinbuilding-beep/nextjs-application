"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { getLatestAllowedBirthDate } from "@/lib/profile/birth-date";

import { Button } from "@vippin/ui/button";
import { Calendar } from "@vippin/ui/calendar";
import { Input } from "@vippin/ui/input";
import { Label } from "@vippin/ui/label";
import { Textarea } from "@vippin/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@vippin/ui/popover";
import { cn } from "@vippin/ui/lib/utils";

import type { OnboardingFormData } from "./types";
import { ONBOARDING_LIMITS, stripAtSign } from "./validation";

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
  const latestAllowedBirthDate = getLatestAllowedBirthDate();

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Como você se chama?</Label>
        <Input
          id="name"
          type="text"
          placeholder="Seu nome completo"
          value={data.name}
          onChange={(e) => onChange("name", stripAtSign(e.target.value))}
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
          placeholder="Seu nome público"
          value={data.creatorName}
          onChange={(e) => onChange("creatorName", stripAtSign(e.target.value))}
          minLength={ONBOARDING_LIMITS.creatorName.min}
          maxLength={ONBOARDING_LIMITS.creatorName.max}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">Bio (opcional)</Label>
        <Textarea
          id="bio"
          placeholder="Conte um pouco sobre você para quem visita seu perfil"
          value={data.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          maxLength={ONBOARDING_LIMITS.bio.max}
          rows={3}
          className="min-h-20 resize-none"
        />
        <p className="text-muted-foreground text-xs text-right">
          {data.bio.length}/{ONBOARDING_LIMITS.bio.max}
        </p>
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
              endMonth={latestAllowedBirthDate}
              disabled={{ after: latestAllowedBirthDate }}
              selected={selectedDate}
              onSelect={(date) => {
                onChange("birthDate", date ? format(date, DATE_FORMAT) : "");
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        <p className="text-muted-foreground text-xs">
          É necessário ter pelo menos {ONBOARDING_LIMITS.minAgeYears} anos.
        </p>
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
