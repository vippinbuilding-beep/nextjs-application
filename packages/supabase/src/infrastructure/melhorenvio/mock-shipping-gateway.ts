import "server-only";

import { randomUUID } from "crypto";

import type { ShippingQuoteOption } from "@vippin/core/models/shipping";
import type {
  AddShipmentToCartInput,
  CartShipment,
  ShipmentTrackingInfo,
  ShippingGateway,
  ShippingQuoteInput,
} from "@vippin/core/shipping/shipping-gateway";

/**
 * Local/dev stand-in for Melhor Envio (`MELHOR_ENVIO_MOCK=true`). Quotes are
 * deterministic (weight + distance between CEP prefixes); labels are fake and
 * the tracking of each label advances one step per call (posted → delivered),
 * so the whole escrow flow can be exercised without credentials.
 */
const labels = new Map<string, { calls: number }>();

export class MockShippingGateway implements ShippingGateway {
  async quote(input: ShippingQuoteInput): Promise<ShippingQuoteOption[]> {
    const distance = Math.abs(
      Number(input.fromPostalCode.slice(0, 2)) - Number(input.toPostalCode.slice(0, 2))
    );
    const kg = Math.max(0.3, input.package.weightGrams / 1000);
    const base = 1490 + Math.round(kg * 600) + distance * 35;
    const options: ShippingQuoteOption[] = [
      { serviceId: 1, serviceName: "PAC", company: "Correios", priceCents: base, deliveryDays: 5 + Math.ceil(distance / 15) },
      { serviceId: 2, serviceName: "SEDEX", company: "Correios", priceCents: Math.round(base * 1.7), deliveryDays: 2 + Math.ceil(distance / 30) },
      { serviceId: 3, serviceName: ".Package", company: "Jadlog", priceCents: Math.round(base * 0.92), deliveryDays: 6 + Math.ceil(distance / 15) },
    ];
    return input.serviceIds?.length
      ? options.filter((o) => input.serviceIds!.includes(o.serviceId))
      : options;
  }

  async addToCart(input: AddShipmentToCartInput): Promise<CartShipment> {
    const [option] = await this.quote({
      fromPostalCode: input.from.postalCode,
      toPostalCode: input.to.postalCode,
      package: input.package,
      insuranceValueCents: input.insuranceValueCents,
      serviceIds: [input.serviceId],
    });
    const id = `mock-${randomUUID()}`;
    labels.set(id, { calls: 0 });
    return { id, protocol: `ORD-${id.slice(5, 13)}`, priceCents: option?.priceCents ?? 1990 };
  }

  async removeFromCart(labelId: string): Promise<void> {
    labels.delete(labelId);
  }

  async checkout(): Promise<void> {}

  async generate(): Promise<void> {}

  async print(labelIds: string[]): Promise<string> {
    return `https://sandbox.melhorenvio.com.br/imprimir/mock?orders=${labelIds.join(",")}`;
  }

  async getTracking(labelIds: string[]): Promise<Record<string, ShipmentTrackingInfo>> {
    const result: Record<string, ShipmentTrackingInfo> = {};
    for (const id of labelIds) {
      const entry = labels.get(id) ?? { calls: 0 };
      entry.calls += 1;
      labels.set(id, entry);
      const now = new Date();
      const status = entry.calls >= 2 ? "delivered" : "posted";
      result[id] = {
        id,
        status,
        trackingCode: `BR${id.slice(5, 14).toUpperCase()}`,
        postedAt: now,
        deliveredAt: status === "delivered" ? now : undefined,
      };
    }
    return result;
  }

  async cancel(labelId: string): Promise<void> {
    labels.delete(labelId);
  }

  async getBalanceCents(): Promise<number> {
    return 100_000;
  }
}
