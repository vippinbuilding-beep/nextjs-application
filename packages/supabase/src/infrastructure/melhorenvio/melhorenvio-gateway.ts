import "server-only";

import {
  decimalReaisToCents,
} from "@vippin/core/domain/shipping";
import type { ShippingQuoteOption } from "@vippin/core/models/shipping";
import {
  ShippingGatewayError,
  type AddShipmentToCartInput,
  type CartShipment,
  type ShipmentTrackingInfo,
  type ShippingGateway,
  type ShippingQuoteInput,
} from "@vippin/core/shipping/shipping-gateway";

const PRODUCTION_BASE_URL = "https://melhorenvio.com.br";
const SANDBOX_BASE_URL = "https://sandbox.melhorenvio.com.br";
const REQUEST_TIMEOUT_MS = 20_000;

/** Melhor Envio expects reais (decimal) for money and kg for weight. */
function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

function gramsToKg(grams: number): number {
  return Math.round(grams) / 1000;
}

function parseMeDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  // "YYYY-MM-DD HH:MM:SS" (America/Sao_Paulo) → ISO with offset.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}-03:00`
    : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

interface MeQuoteRow {
  id: number;
  name?: string;
  price?: string | number;
  custom_price?: string | number;
  delivery_time?: number;
  custom_delivery_time?: number;
  company?: { name?: string };
  error?: string;
}

interface MeTrackingRow {
  id?: string;
  status?: string;
  tracking?: string | null;
  melhorenvio_tracking?: string | null;
  tracking_url?: string | null;
  posted_at?: string | null;
  delivered_at?: string | null;
  canceled_at?: string | null;
  expired_at?: string | null;
}

function classifyError(status: number, message: string): ShippingGatewayError {
  const lower = message.toLowerCase();
  if (status === 401 || status === 403) {
    return new ShippingGatewayError(
      "not_configured",
      "Token da Melhor Envio inválido ou sem permissão.",
      message
    );
  }
  if (lower.includes("saldo") || lower.includes("balance")) {
    return new ShippingGatewayError(
      "insufficient_balance",
      "Saldo insuficiente na carteira da Melhor Envio.",
      message
    );
  }
  if (lower.includes("limite") || lower.includes("limit")) {
    return new ShippingGatewayError(
      "label_limit",
      "Limite de etiquetas não postadas atingido na Melhor Envio.",
      message
    );
  }
  if (status === 422 || status === 400) {
    return new ShippingGatewayError("invalid_data", message, message);
  }
  if (status >= 500 || status === 0) {
    return new ShippingGatewayError(
      "unavailable",
      "A Melhor Envio está indisponível no momento.",
      message
    );
  }
  return new ShippingGatewayError("unknown", message, message);
}

/** Flattens Laravel-style `{ message, errors: { field: [msg] } }` bodies. */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as { message?: unknown; error?: unknown; errors?: unknown };
  const parts: string[] = [];
  if (typeof record.message === "string") parts.push(record.message);
  if (typeof record.error === "string") parts.push(record.error);
  if (record.errors && typeof record.errors === "object") {
    for (const value of Object.values(record.errors as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const item of value) if (typeof item === "string") parts.push(item);
      } else if (typeof value === "string") {
        parts.push(value);
      }
    }
  }
  return parts.length ? parts.join(" ") : fallback;
}

/**
 * Melhor Envio (API v2) implementation of {@link ShippingGateway}.
 *
 * Server-only: uses the platform's central account token
 * (`MELHOR_ENVIO_TOKEN`). Every label is paid with that account's Melhor
 * Carteira; the creator is only the sender printed on the label.
 *
 * Env:
 *   MELHOR_ENVIO_TOKEN          access token (panel → Integrações → Permissões de acesso)
 *   MELHOR_ENVIO_SANDBOX=true   use sandbox.melhorenvio.com.br
 *   MELHOR_ENVIO_BASE_URL       optional override
 *   MELHOR_ENVIO_USER_AGENT     "Vippin (contato@dominio)" — required by the API
 */
export class MelhorEnvioShippingGateway implements ShippingGateway {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor() {
    const token = process.env.MELHOR_ENVIO_TOKEN;
    if (!token) {
      throw new ShippingGatewayError(
        "not_configured",
        "Missing MELHOR_ENVIO_TOKEN environment variable (server-only)."
      );
    }
    this.token = token;
    const sandbox = process.env.MELHOR_ENVIO_SANDBOX === "true";
    this.baseUrl =
      process.env.MELHOR_ENVIO_BASE_URL ||
      (sandbox ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL);
    this.userAgent =
      process.env.MELHOR_ENVIO_USER_AGENT || "Vippin (suporte@vippin.com.br)";
  }

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.token}`,
          "user-agent": this.userAgent,
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "network error";
      throw classifyError(0, message);
    } finally {
      clearTimeout(timer);
    }

    const raw = await response.text();
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      throw classifyError(
        response.status,
        extractErrorMessage(parsed, `Melhor Envio request failed (${response.status}).`)
      );
    }
    return parsed as T;
  }

  async quote(input: ShippingQuoteInput): Promise<ShippingQuoteOption[]> {
    const rows = await this.request<MeQuoteRow[] | MeQuoteRow>(
      "POST",
      "/api/v2/me/shipment/calculate",
      {
        from: { postal_code: input.fromPostalCode },
        to: { postal_code: input.toPostalCode },
        products: [
          {
            id: "1",
            width: input.package.widthCm,
            height: input.package.heightCm,
            length: input.package.lengthCm,
            weight: gramsToKg(input.package.weightGrams),
            insurance_value: centsToReais(input.insuranceValueCents),
            quantity: 1,
          },
        ],
        options: { receipt: false, own_hand: false },
        ...(input.serviceIds?.length
          ? { services: input.serviceIds.join(",") }
          : {}),
      }
    );

    const list = Array.isArray(rows) ? rows : [rows];
    const options: ShippingQuoteOption[] = [];
    for (const row of list) {
      if (!row || row.error) continue;
      const priceCents = decimalReaisToCents(row.custom_price ?? row.price);
      if (priceCents <= 0) continue;
      options.push({
        serviceId: row.id,
        serviceName: row.name ?? `Serviço ${row.id}`,
        company: row.company?.name ?? "Transportadora",
        priceCents,
        deliveryDays: row.custom_delivery_time ?? row.delivery_time ?? 0,
      });
    }
    return options;
  }

  async addToCart(input: AddShipmentToCartInput): Promise<CartShipment> {
    const isCompany = input.from.document.length === 14;
    const commercial = Boolean(input.invoiceKey);

    const data = await this.request<{ id: string; protocol?: string; price?: string | number }>(
      "POST",
      "/api/v2/me/cart",
      {
        service: input.serviceId,
        from: {
          name: input.from.name,
          phone: input.from.phone,
          email: input.from.email ?? undefined,
          document: isCompany ? "" : input.from.document,
          company_document: isCompany ? input.from.document : "",
          state_register: commercial ? (input.from.stateRegister ?? "") : "ISENTO",
          address: input.from.street,
          complement: input.from.complement ?? "",
          number: input.from.number,
          district: input.from.district,
          city: input.from.city,
          country_id: "BR",
          postal_code: input.from.postalCode,
          state_abbr: input.from.state,
        },
        to: {
          name: input.to.name,
          phone: input.to.phone,
          email: input.to.email ?? undefined,
          document: input.to.document.length === 11 ? input.to.document : "",
          company_document: input.to.document.length === 14 ? input.to.document : "",
          state_register: "ISENTO",
          address: input.to.street,
          complement: input.to.complement ?? "",
          number: input.to.number,
          district: input.to.district,
          city: input.to.city,
          country_id: "BR",
          postal_code: input.to.postalCode,
          state_abbr: input.to.state,
        },
        products: input.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitary_value: centsToReais(item.unitaryValueCents),
        })),
        volumes: [
          {
            height: input.package.heightCm,
            width: input.package.widthCm,
            length: input.package.lengthCm,
            weight: gramsToKg(input.package.weightGrams),
          },
        ],
        options: {
          insurance_value: centsToReais(input.insuranceValueCents),
          receipt: false,
          own_hand: false,
          reverse: false,
          non_commercial: !commercial,
          ...(commercial ? { invoice: { key: input.invoiceKey } } : {}),
          platform: "Vippin",
          reminder: input.reminder,
          tags: [{ tag: input.externalId, url: input.externalUrl ?? null }],
        },
      }
    );

    if (!data?.id) {
      throw new ShippingGatewayError("unknown", "A Melhor Envio não retornou o id da etiqueta.");
    }
    return {
      id: data.id,
      protocol: data.protocol,
      priceCents: decimalReaisToCents(data.price),
    };
  }

  async removeFromCart(labelId: string): Promise<void> {
    await this.request("DELETE", `/api/v2/me/cart/${encodeURIComponent(labelId)}`);
  }

  async checkout(labelIds: string[]): Promise<void> {
    await this.request("POST", "/api/v2/me/shipment/checkout", { orders: labelIds });
  }

  async generate(labelIds: string[]): Promise<void> {
    const result = await this.request<Record<string, { status?: boolean; message?: string }>>(
      "POST",
      "/api/v2/me/shipment/generate",
      { orders: labelIds }
    );
    for (const id of labelIds) {
      const entry = result?.[id];
      if (entry && entry.status === false) {
        throw new ShippingGatewayError(
          "invalid_data",
          entry.message ?? "Não foi possível gerar a etiqueta."
        );
      }
    }
  }

  async print(labelIds: string[]): Promise<string> {
    const data = await this.request<{ url?: string }>(
      "POST",
      "/api/v2/me/shipment/print",
      // Public link: the creator isn't logged into Melhor Envio. We only hand
      // it out through our own authenticated route (302).
      { mode: "public", orders: labelIds }
    );
    if (!data?.url) {
      throw new ShippingGatewayError("unknown", "A Melhor Envio não retornou o link da etiqueta.");
    }
    return data.url;
  }

  async getTracking(
    labelIds: string[]
  ): Promise<Record<string, ShipmentTrackingInfo>> {
    if (!labelIds.length) return {};
    const data = await this.request<Record<string, MeTrackingRow>>(
      "POST",
      "/api/v2/me/shipment/tracking",
      { orders: labelIds }
    );
    const result: Record<string, ShipmentTrackingInfo> = {};
    for (const [key, row] of Object.entries(data ?? {})) {
      if (!row || typeof row !== "object") continue;
      result[key] = {
        id: row.id ?? key,
        status: row.status ?? "",
        trackingCode: row.tracking ?? undefined,
        trackingUrl:
          row.tracking_url ??
          (row.melhorenvio_tracking
            ? `https://www.melhorrastreio.com.br/rastreio/${row.melhorenvio_tracking}`
            : undefined),
        postedAt: parseMeDate(row.posted_at),
        deliveredAt: parseMeDate(row.delivered_at),
        canceledAt: parseMeDate(row.canceled_at),
        expiredAt: parseMeDate(row.expired_at),
      };
    }
    return result;
  }

  async cancel(labelId: string, description: string): Promise<void> {
    const result = await this.request<Record<string, { canceled?: boolean }>>(
      "POST",
      "/api/v2/me/shipment/cancel",
      { order: { id: labelId, reason_id: "2", description: description.slice(0, 255) } }
    );
    const entry = result?.[labelId];
    if (entry && entry.canceled === false) {
      throw new ShippingGatewayError(
        "not_cancellable",
        "A etiqueta não pode mais ser cancelada (já foi postada ou coletada)."
      );
    }
  }

  async getBalanceCents(): Promise<number> {
    const data = await this.request<{ balance?: number | string }>(
      "GET",
      "/api/v2/me/balance"
    );
    return decimalReaisToCents(data?.balance ?? 0);
  }
}
