import { parse, startOfDay, subYears } from "date-fns";

const DATE_FORMAT = "yyyy-MM-dd";

/** Minimum age to register as a creator (years). */
export const PROFILE_MIN_AGE_YEARS = 15;

/** Latest birth date allowed (inclusive) for someone who meets the minimum age today. */
export function getLatestAllowedBirthDate(now = new Date()): Date {
  return startOfDay(subYears(now, PROFILE_MIN_AGE_YEARS));
}

export function validateBirthDateAge(birthDate: string): string | null {
  const trimmed = birthDate.trim();
  if (!trimmed) {
    return "Selecione sua data de nascimento";
  }

  const parsed = parse(trimmed, DATE_FORMAT, new Date());
  if (Number.isNaN(parsed.getTime())) {
    return "Data de nascimento inválida";
  }

  const birth = startOfDay(parsed);
  const latestAllowed = getLatestAllowedBirthDate();

  if (birth > startOfDay(new Date())) {
    return "A data de nascimento não pode ser no futuro";
  }

  if (birth > latestAllowed) {
    return `Você precisa ter pelo menos ${PROFILE_MIN_AGE_YEARS} anos para se cadastrar`;
  }

  return null;
}
