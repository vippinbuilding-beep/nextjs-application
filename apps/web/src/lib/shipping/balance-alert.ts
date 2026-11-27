import "server-only";

import { formatBRL } from "@vippin/core/domain/money";
import { ShippingGatewayError } from "@vippin/core/shipping/shipping-gateway";
import { sendOpsAlert } from "@/lib/alerts/discord";
import { LOW_BALANCE_CENTS } from "@/lib/shipping/config";
import { getShippingGateway } from "@vippin/supabase/factories/shipping-factory";

export interface BalanceCheckResult {
  balanceCents: number;
  low: boolean;
  alerted: boolean;
}

/**
 * Daily check of the central Melhor Carteira: every creator's label is paid
 * from it, so the team is warned on Discord before it runs out (the creator
 * would otherwise hit "saldo insuficiente" at "Preparar envio").
 */
export async function runShippingBalanceCheck(): Promise<BalanceCheckResult> {
  const balanceCents = await getShippingGateway().getBalanceCents();
  const low = balanceCents < LOW_BALANCE_CENTS;
  const alerted = low
    ? await sendOpsAlert(
        `⚠️ **Saldo baixo na Melhor Carteira:** ${formatBRL(balanceCents)} ` +
          `(alerta abaixo de ${formatBRL(LOW_BALANCE_CENTS)}). ` +
          "Reponha o saldo para os criadores conseguirem gerar etiquetas."
      )
    : false;
  return { balanceCents, low, alerted };
}

const BLOCKING_ERRORS: Partial<Record<ShippingGatewayError["code"], string>> = {
  insufficient_balance: "saldo insuficiente na Melhor Carteira. Reponha o saldo",
  label_limit:
    "limite de etiquetas não postadas atingido na Melhor Envio. Peça aumento do limite ou cancele etiquetas paradas",
  not_configured: "token da Melhor Envio inválido ou sem permissão. Confira MELHOR_ENVIO_TOKEN",
  unavailable: "a Melhor Envio está fora do ar. Acompanhe e avise o criador se demorar",
};

/**
 * Immediate alert when a creator is blocked at "Preparar envio" by a problem
 * only the team can fix (wallet, label limit, token, outage).
 */
export async function alertBlockedLabel(err: unknown, orderId: string): Promise<void> {
  if (!(err instanceof ShippingGatewayError)) return;
  const reason = BLOCKING_ERRORS[err.code];
  if (!reason) return;
  await sendOpsAlert(
    `🚨 **Criador travado ao gerar etiqueta** (pedido \`${orderId}\`): ${reason}. ` +
      "Depois, peça para o criador clicar em Preparar envio de novo."
  );
}
