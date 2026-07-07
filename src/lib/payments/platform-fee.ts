/**
 * Platform fee configuration (shared by server splits and client UI labels).
 *
 * `NEXT_PUBLIC_PLATFORM_FEE_PERCENT` — percent kept per sale (default 10).
 * Per sale, `ABACATEPAY_PIX_SEND_FEE_CENTS` (R$ 0,80) is deducted first; the platform
 * then keeps `NEXT_PUBLIC_PLATFORM_FEE_PERCENT` of the remainder.
 * On withdraw, another R$ 0,80 PIX fee is deducted from the creator balance.
 */

import { formatBRL } from "@/lib/money";

const DEFAULT_PLATFORM_FEE_PERCENT = 10;

/** Fixed platform fee per sale (R$ 0,80). */
export const ABACATEPAY_PIX_SEND_FEE_CENTS = 80;

function parsePercentEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw.trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return fallback;
  return parsed;
}

/** Platform fee as whole percent (e.g. 10). */
export const PLATFORM_FEE_PERCENT = Math.round(
  parsePercentEnv("NEXT_PUBLIC_PLATFORM_FEE_PERCENT", DEFAULT_PLATFORM_FEE_PERCENT)
);

/** Creator share as whole percent after per-sale fixed fee (e.g. 90). */
export const CREATOR_FEE_PERCENT = 100 - PLATFORM_FEE_PERCENT;

/** Platform fee as decimal rate (e.g. 0.10). */
export const PLATFORM_FEE_RATE = PLATFORM_FEE_PERCENT / 100;

const PIX_FEE_LABEL = formatBRL(ABACATEPAY_PIX_SEND_FEE_CENTS);

export function formatPlatformFeePercent(): string {
  return `${PLATFORM_FEE_PERCENT}%`;
}

export function formatCreatorFeePercent(): string {
  return `${CREATOR_FEE_PERCENT}%`;
}

/** Neutral copy for the finance module header (no fee breakdown). */
export function creatorFinancePageDescription(): string {
  return "Acompanhe seu saldo e transfira para a chave PIX cadastrada no perfil.";
}

/** Card copy for the dashboard withdraw balance (minimum only). */
export function creatorWithdrawBalanceDescription(): string {
  return "Valor líquido disponível para transferência.";
}

function creatorPerSaleFeeBreakdown(unitLabel: string): string {
  return (
    `Por ${unitLabel} paga: desconta-se ${PIX_FEE_LABEL} (taxa PIX) e, sobre o restante, ` +
    `a plataforma retém ${formatPlatformFeePercent()}.`
  );
}

/** Collapsible fee breakdown shown discreetly on the finance screen. */
export function creatorWithdrawFeeDetails(): string {
  return (
    `${creatorPerSaleFeeBreakdown("venda ou pergunta")} No saque, é descontado mais ` +
    `${PIX_FEE_LABEL} de taxa PIX. O valor exibido acima já reflete esses descontos acumulados.`
  );
}

/** Product pricing hint for creators. */
export function creatorProductFeeDescription(): string {
  return (
    `${creatorPerSaleFeeBreakdown("venda")} No saque: mais ${PIX_FEE_LABEL} de taxa PIX.`
  );
}

/** Me Pergunte pricing hint for creators. */
export function creatorMePergunteFeeDescription(): string {
  return (
    `${creatorPerSaleFeeBreakdown("pergunta")} No saque: mais ${PIX_FEE_LABEL} de taxa PIX.`
  );
}
