/**
 * Platform fee configuration (shared by server splits and client UI labels).
 *
 * Set `NEXT_PUBLIC_PLATFORM_FEE_PERCENT` in `.env.local` (integer, e.g. `14`).
 * The creator receives `100 − fee` percent of each sale.
 */

const DEFAULT_PLATFORM_FEE_PERCENT = 14;

function parsePercentEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw.trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return fallback;
  return parsed;
}

/** Platform fee as whole percent (e.g. 14). */
export const PLATFORM_FEE_PERCENT = Math.round(
  parsePercentEnv("NEXT_PUBLIC_PLATFORM_FEE_PERCENT", DEFAULT_PLATFORM_FEE_PERCENT)
);

/** Creator share as whole percent (e.g. 86). */
export const CREATOR_FEE_PERCENT = 100 - PLATFORM_FEE_PERCENT;

/** Platform fee as decimal rate (e.g. 0.14). */
export const PLATFORM_FEE_RATE = PLATFORM_FEE_PERCENT / 100;

export function formatPlatformFeePercent(): string {
  return `${PLATFORM_FEE_PERCENT}%`;
}

export function formatCreatorFeePercent(): string {
  return `${CREATOR_FEE_PERCENT}%`;
}

/** Card copy for the dashboard withdraw balance. */
export function creatorWithdrawBalanceDescription(): string {
  return `Valor líquido no saque: ${formatCreatorFeePercent()} das vendas (taxa da plataforma: ${formatPlatformFeePercent()}).`;
}

/** Me Pergunte pricing hint for creators. */
export function creatorMePergunteFeeDescription(): string {
  return `Você recebe ${formatCreatorFeePercent()} ao sacar; a plataforma fica com ${formatPlatformFeePercent()}.`;
}
