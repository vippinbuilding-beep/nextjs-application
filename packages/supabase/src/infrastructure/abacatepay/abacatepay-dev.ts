import "server-only";

/**
 * Generic error returned by AbacatePay when `/pix/send` (and similar outbound
 * flows) are called with a Dev-mode API key. Not a real outage — the endpoint is
 * unsupported in sandbox. See: https://github.com/AbacatePay/documentation/issues/66
 */
export const ABACATE_PAY_PIX_SEND_DEV_ERROR =
  "Serviço temporariamente indisponível";

/** Prefix for transfer ids faked locally when `/pix/send` is skipped in dev. */
export const DEV_SIMULATED_TRANSFER_PREFIX = "dev_sim_";

/**
 * Whether outbound PIX transfers should be simulated instead of calling
 * `/pix/send`. Defaults to `true` in `NODE_ENV=development`; set
 * `ABACATEPAY_DEV_MODE=false` to hit the real API locally.
 */
export function isAbacatePayDevMode(): boolean {
  const flag = process.env.ABACATEPAY_DEV_MODE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV === "development";
}

export function buildDevSimulatedTransferId(externalId: string): string {
  return `${DEV_SIMULATED_TRANSFER_PREFIX}${externalId}`;
}

export function isDevSimulatedTransferId(id: string | undefined): boolean {
  return id?.startsWith(DEV_SIMULATED_TRANSFER_PREFIX) ?? false;
}
