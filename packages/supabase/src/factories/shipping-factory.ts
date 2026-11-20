import "server-only";

import type { ShipmentRepository } from "@vippin/core/repositories/shipment-repository";
import type { ShippingGateway } from "@vippin/core/shipping/shipping-gateway";
import { MelhorEnvioShippingGateway } from "../infrastructure/melhorenvio/melhorenvio-gateway";
import { MockShippingGateway } from "../infrastructure/melhorenvio/mock-shipping-gateway";
import { SupabaseShipmentRepository } from "../infrastructure/supabase/supabase-shipment-repository";
import { createSupabaseAdminClient } from "../client/admin";

/**
 * Server-only composition root for the shipping stack (Melhor Envio token and
 * Supabase service role). Never import from client components.
 *
 * `MELHOR_ENVIO_MOCK=true` swaps in a simulated gateway for local development.
 */

let gateway: ShippingGateway | null = null;

export function isShippingMockMode(): boolean {
  return process.env.MELHOR_ENVIO_MOCK === "true";
}

export function getShippingGateway(): ShippingGateway {
  if (!gateway) {
    gateway = isShippingMockMode()
      ? new MockShippingGateway()
      : new MelhorEnvioShippingGateway();
  }
  return gateway;
}

let shipmentRepository: ShipmentRepository | null = null;

export function getShipmentRepository(): ShipmentRepository {
  if (!shipmentRepository) {
    shipmentRepository = new SupabaseShipmentRepository(createSupabaseAdminClient());
  }
  return shipmentRepository;
}
