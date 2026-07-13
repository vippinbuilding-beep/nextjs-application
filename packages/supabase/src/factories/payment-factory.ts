import "server-only";

import type { PaymentGateway } from "@vippin/core/payments/payment-gateway";
import type { OrderRepository } from "@vippin/core/repositories/order-repository";
import { AbacatePayGateway } from "../infrastructure/abacatepay/abacatepay-gateway";
import { SupabaseOrderRepository } from "../infrastructure/supabase/supabase-order-repository";
import { createSupabaseAdminClient } from "../client/admin";

/**
 * Server-only composition root for the payment stack.
 *
 * Kept separate from `repository-factory.ts` (which is safe to import from the
 * browser) because both the payment gateway and the order repository rely on
 * secrets — the AbacatePay API key and the Supabase service role — that must
 * never reach the client. The `server-only` import enforces that at build time.
 */

let gateway: PaymentGateway | null = null;

export function getPaymentGateway(): PaymentGateway {
  if (!gateway) gateway = new AbacatePayGateway();
  return gateway;
}

let orderRepository: OrderRepository | null = null;

export function getOrderRepository(): OrderRepository {
  if (!orderRepository) {
    orderRepository = new SupabaseOrderRepository(createSupabaseAdminClient());
  }
  return orderRepository;
}
