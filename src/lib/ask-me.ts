import { cpf, cnpj } from "cpf-cnpj-validator";

import type { PixKeyType } from "@/core/models/user";

export const ASK_ME_LIMITS = {
  minPriceCents: 200,
  defaultPriceCents: 200,
  maxPriceCents: 500_00,
  question: { min: 10, max: 500 },
  answerText: { min: 1, max: 2000 },
  responseDeadlineHours: 72,
  videoMaxSize: 100 * 1024 * 1024,
} as const;

export const ASK_ME_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

export function resolveAskMePriceCents(
  enabled: boolean,
  priceCents?: number | null
): number {
  if (!enabled) return ASK_ME_LIMITS.defaultPriceCents;
  if (priceCents == null || priceCents < ASK_ME_LIMITS.minPriceCents) {
    return ASK_ME_LIMITS.defaultPriceCents;
  }
  return priceCents;
}

export function validateAskMeQuestion(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < ASK_ME_LIMITS.question.min) {
    return `A pergunta precisa ter pelo menos ${ASK_ME_LIMITS.question.min} caracteres`;
  }
  if (trimmed.length > ASK_ME_LIMITS.question.max) {
    return `A pergunta pode ter no máximo ${ASK_ME_LIMITS.question.max} caracteres`;
  }
  return null;
}

export function validateAskMeAnswerText(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < ASK_ME_LIMITS.answerText.min) {
    return "A resposta não pode ficar vazia";
  }
  if (trimmed.length > ASK_ME_LIMITS.answerText.max) {
    return `A resposta pode ter no máximo ${ASK_ME_LIMITS.answerText.max} caracteres`;
  }
  return null;
}

export function validateAskMePriceInput(cents: number): string | null {
  if (cents < ASK_ME_LIMITS.minPriceCents) {
    return `O valor mínimo é R$ ${(ASK_ME_LIMITS.minPriceCents / 100).toFixed(2).replace(".", ",")}`;
  }
  if (cents > ASK_ME_LIMITS.maxPriceCents) {
    return "Valor muito alto";
  }
  return null;
}

export function validateAskMeVideo(file: File): string | null {
  if (!file.type.startsWith("video/")) {
    return "Envie um vídeo MP4, WebM ou MOV.";
  }
  if (file.size > ASK_ME_LIMITS.videoMaxSize) {
    return "O vídeo é muito grande. Máximo: 100 MB.";
  }
  return null;
}

export function formatAskMeDeadline(deadline: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(deadline);
}

export function isAskMeAwaitingResponse(status: string): boolean {
  return status === "awaiting_response";
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  awaiting_response: "Aguardando resposta",
  answered: "Respondida",
  declined: "Recusada",
  expired: "Prazo esgotado",
  payment_expired: "Pagamento expirado",
  failed: "Falhou",
};

export function getAskMeStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** Infers PIX key type for ask-me refund keys (broader than creator CPF/CNPJ). */
export function inferRefundPixKeyType(value: string): PixKeyType | "" {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && cpf.isValid(digits)) return "CPF";
  if (digits.length === 14 && cnpj.isValid(digits)) return "CNPJ";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "EMAIL";
  if (digits.length >= 10 && digits.length <= 11) return "PHONE";
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      trimmed
    )
  ) {
    return "RANDOM";
  }
  if (trimmed.length >= 32) return "RANDOM";

  return "";
}

export function validateRefundPixKey(value: string): string | null {
  if (!inferRefundPixKeyType(value)) {
    return "Informe uma chave PIX válida para reembolso (CPF, CNPJ, e-mail, telefone ou aleatória).";
  }
  return null;
}
