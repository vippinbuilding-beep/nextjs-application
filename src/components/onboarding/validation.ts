import { cpf, cnpj } from "cpf-cnpj-validator";

import type { PixKeyType, UserSocials } from "@/core/models/user";

import type { OnboardingFormData } from "./types";

export const ONBOARDING_LIMITS = {
  name: { min: 3, max: 80 },
  creatorName: { min: 2, max: 40 },
  // CPF formatado tem 14 caracteres, CNPJ formatado tem 18.
  pixKey: { min: 14, max: 18 },
  social: { min: 3, max: 120 },
} as const;

const SOCIAL_LABELS: Record<keyof UserSocials, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  twitch: "Twitch",
};

interface SocialConfig {
  // Hosts aceitos quando o usuário cola uma URL (sem o "www.").
  hosts: string[];
  // Host usado para montar a URL canônica a partir de um @usuário.
  canonicalHost: string;
  // Prefixo de caminho usado ao montar a URL a partir de um @usuário.
  // Ex.: TikTok/YouTube usam "@" no caminho; LinkedIn usa "in/".
  handlePrefix: string;
  // Caracteres válidos para o @usuário (já sem o "@" inicial).
  handlePattern: RegExp;
}

const SOCIAL_CONFIG: Record<keyof UserSocials, SocialConfig> = {
  instagram: {
    hosts: ["instagram.com"],
    canonicalHost: "instagram.com",
    handlePrefix: "",
    handlePattern: /^[a-zA-Z0-9._]{2,30}$/,
  },
  tiktok: {
    hosts: ["tiktok.com"],
    canonicalHost: "tiktok.com",
    handlePrefix: "@",
    handlePattern: /^[a-zA-Z0-9._]{2,24}$/,
  },
  youtube: {
    hosts: ["youtube.com"],
    canonicalHost: "youtube.com",
    handlePrefix: "@",
    handlePattern: /^[a-zA-Z0-9._-]{3,30}$/,
  },
  linkedin: {
    hosts: ["linkedin.com"],
    canonicalHost: "linkedin.com",
    handlePrefix: "in/",
    handlePattern: /^[a-zA-Z0-9-]{3,100}$/,
  },
  x: {
    hosts: ["x.com", "twitter.com"],
    canonicalHost: "x.com",
    handlePrefix: "",
    handlePattern: /^[a-zA-Z0-9_]{1,15}$/,
  },
  twitch: {
    hosts: ["twitch.tv"],
    canonicalHost: "twitch.tv",
    handlePrefix: "",
    handlePattern: /^[a-zA-Z0-9_]{3,25}$/,
  },
};

const KNOWN_SOCIAL_HOSTS = new Set(
  Object.values(SOCIAL_CONFIG).flatMap((config) => config.hosts)
);

function isBetween(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

/** Insere separadores nas posições indicadas (0-indexed pelos caracteres crus). */
function applyMask(chars: string, separators: Record<number, string>): string {
  let output = "";
  for (let i = 0; i < chars.length; i += 1) {
    if (separators[i]) output += separators[i];
    output += chars[i];
  }
  return output;
}

/**
 * Aplica a máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
 * conforme o usuário digita.
 *
 * O CPF é sempre numérico (até 11 dígitos). O CNPJ segue o formato da Nota
 * Técnica RFB 49/2024: as 12 primeiras posições podem ser letras (A-Z) ou
 * dígitos e os 2 últimos (DVs) são sempre numéricos. Qualquer letra digitada
 * faz o valor ser tratado como CNPJ.
 */
export function formatPixKey(value: string): string {
  const raw = value.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const hasLetters = /[A-Z]/.test(raw);

  if (!hasLetters && raw.length <= 11) {
    return applyMask(raw.slice(0, 11), { 3: ".", 6: ".", 9: "-" });
  }

  const base = raw.slice(0, 12);
  const verifierDigits = raw.slice(12, 14).replace(/\D/g, "");
  return applyMask(base + verifierDigits, { 2: ".", 5: ".", 8: "/", 12: "-" });
}

function isValidCpf(value: string): boolean {
  return cpf.isValid(value);
}

function isValidCnpj(value: string): boolean {
  return cnpj.isValid(value);
}

export function inferPixKeyType(value: string): PixKeyType | "" {
  const normalizedValue = value.trim();
  if (isValidCpf(normalizedValue)) return "CPF";
  if (isValidCnpj(normalizedValue)) return "CNPJ";
  return "";
}

function parseSocialUrl(value: string): URL | null {
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
}

function baseHost(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

function isAllowedSocialHost(key: keyof UserSocials, hostname: string): boolean {
  const host = baseHost(hostname);
  return SOCIAL_CONFIG[key].hosts.some(
    (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`)
  );
}

function isKnownSocialHost(hostname: string): boolean {
  const host = baseHost(hostname);
  return [...KNOWN_SOCIAL_HOSTS].some(
    (knownHost) => host === knownHost || host.endsWith(`.${knownHost}`)
  );
}

/**
 * Converte o que o usuário digitou (um @usuário, um slug, ou uma URL completa,
 * com ou sem protocolo/www/tracking) na URL canônica da rede social.
 *
 * - URL de outra plataforma (ex.: link do Instagram no campo do YouTube): rejeita.
 * - URL da própria plataforma: preserva o caminho do perfil/canal e descarta
 *   protocolo, "www", querystring e barra final.
 * - @usuário ou slug: monta a URL canônica da plataforma.
 *
 * Retorna `null` quando o valor não é um perfil válido para a rede informada.
 */
export function normalizeSocialValue(key: keyof UserSocials, value: string): string | null {
  const trimmed = value.trim();
  if (!isBetween(trimmed, ONBOARDING_LIMITS.social.min, ONBOARDING_LIMITS.social.max)) {
    return null;
  }

  const config = SOCIAL_CONFIG[key];
  const url = parseSocialUrl(trimmed);

  if (url && isKnownSocialHost(url.hostname)) {
    if (!isAllowedSocialHost(key, url.hostname)) return null;
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    if (!path) return null;
    return `https://${config.canonicalHost}/${path}`;
  }

  const handle = trimmed.replace(/^@+/, "");
  if (!config.handlePattern.test(handle)) return null;
  return `https://${config.canonicalHost}/${config.handlePrefix}${handle}`;
}

export function normalizeOnboardingForm(form: OnboardingFormData): OnboardingFormData {
  const socials = Object.entries(form.socials).reduce<Partial<UserSocials>>((acc, [key, value]) => {
    const socialKey = key as keyof UserSocials;
    const trimmedValue = value?.trim();
    if (trimmedValue) {
      // Salva a URL canônica quando válida; caso contrário mantém o que foi
      // digitado para a etapa de validação sinalizar o erro ao usuário.
      acc[socialKey] = normalizeSocialValue(socialKey, trimmedValue) ?? trimmedValue;
    }
    return acc;
  }, {});

  return {
    name: form.name.trim(),
    birthDate: form.birthDate,
    pixKey: form.pixKey.trim(),
    pixKeyType: form.pixKeyType,
    creatorName: form.creatorName.trim(),
    socials,
  };
}

export function validateProfileStep(form: OnboardingFormData): string | null {
  const normalizedForm = normalizeOnboardingForm(form);

  if (!isBetween(normalizedForm.name, ONBOARDING_LIMITS.name.min, ONBOARDING_LIMITS.name.max)) {
    return `O nome precisa ter entre ${ONBOARDING_LIMITS.name.min} e ${ONBOARDING_LIMITS.name.max} caracteres`;
  }

  if (
    !isBetween(
      normalizedForm.creatorName,
      ONBOARDING_LIMITS.creatorName.min,
      ONBOARDING_LIMITS.creatorName.max
    )
  ) {
    return `O nome público precisa ter entre ${ONBOARDING_LIMITS.creatorName.min} e ${ONBOARDING_LIMITS.creatorName.max} caracteres`;
  }

  if (!normalizedForm.birthDate) {
    return "Selecione sua data de nascimento";
  }

  if (!inferPixKeyType(normalizedForm.pixKey)) {
    return "Informe um CPF ou CNPJ válido";
  }

  return null;
}

export function validateSocialsStep(socials: Partial<UserSocials>): string | null {
  const entries = Object.entries(socials).filter(([, value]) => value?.trim());

  if (entries.length === 0) {
    return "Preencha pelo menos uma rede social";
  }

  const invalidSocial = entries.find(
    ([key, value]) => normalizeSocialValue(key as keyof UserSocials, value?.trim() ?? "") === null
  );

  if (invalidSocial) {
    const label = SOCIAL_LABELS[invalidSocial[0] as keyof UserSocials];
    return `Informe um usuário ou link válido para ${label}`;
  }

  return null;
}
