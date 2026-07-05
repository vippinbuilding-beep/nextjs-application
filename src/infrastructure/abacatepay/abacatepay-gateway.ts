import "server-only";

import type {
  CreatePixChargeInput,
  PaymentGateway,
  PixCharge,
  PixChargeStatus,
  PixTransfer,
  PixTransferStatus,
  SendPixInput,
} from "@/core/payments/payment-gateway";
import type { PixKeyType } from "@/core/models/user";
import {
  buildDevSimulatedTransferId,
  isAbacatePayDevMode,
} from "@/lib/payments/abacatepay-dev";

const DEFAULT_BASE_URL = "https://api.abacatepay.com/v2";

// AbacatePay envelopes every response as { data, error, success }.
type AbacateEnvelope<T> =
  | { data: T; error: null; success: true }
  | { data: null; error: string; success: false };

interface AbacateQRCode {
  id: string;
  amount: number;
  status: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

interface AbacatePixTransaction {
  id: string;
  amount: number;
  status: "PENDING" | "EXPIRED" | "CANCELLED" | "COMPLETE" | "REFUNDED";
}

function mapChargeStatus(status: AbacateQRCode["status"]): PixChargeStatus {
  switch (status) {
    case "PAID":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "CANCELLED":
      return "cancelled";
    case "REFUNDED":
      return "refunded";
    default:
      return "pending";
  }
}

function mapTransferStatus(
  status: AbacatePixTransaction["status"]
): PixTransferStatus {
  switch (status) {
    case "COMPLETE":
      return "complete";
    case "EXPIRED":
      return "expired";
    case "CANCELLED":
      return "cancelled";
    case "REFUNDED":
      return "refunded";
    default:
      return "pending";
  }
}

/**
 * Normalizes a stored PIX key into the format AbacatePay expects. Keys are saved
 * in the profile as the creator typed them (often masked, e.g. "123.456.789-01"
 * or "(11) 99999-9999"); the API wants raw digits for document/phone keys.
 */
function normalizePixKey(key: string, type: PixKeyType): string {
  const trimmed = key.trim();
  switch (type) {
    case "CPF":
    case "CNPJ":
    case "PHONE":
      return trimmed.replace(/\D/g, "");
    case "EMAIL":
      return trimmed.toLowerCase();
    default:
      return trimmed;
  }
}

/**
 * AbacatePay (REST v2) implementation of {@link PaymentGateway}.
 *
 * Server-only: it uses the secret API key and must never reach the browser.
 * We call the REST API directly (instead of the SDK) because the third-party
 * transfer endpoint (`/pix/send`) isn't exposed by the current SDK, and this
 * keeps a single, explicit contract for every call.
 */
export class AbacatePayGateway implements PaymentGateway {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing ABACATEPAY_API_KEY environment variable. Set it in your server " +
        "environment (never expose it to the client)."
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = process.env.ABACATEPAY_BASE_URL || DEFAULT_BASE_URL;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const raw = await response.text();
    let envelope: AbacateEnvelope<T> | null = null;
    try {
      envelope = raw ? (JSON.parse(raw) as AbacateEnvelope<T>) : null;
    } catch {
      envelope = null;
    }

    const apiError =
      envelope && "error" in envelope && envelope.error
        ? envelope.error
        : null;

    // The body stream can only be read once — never log `response.json()` before
    // parsing here, or the second read returns empty and we falsely fail on 200.
    if (!response.ok || !envelope?.data || apiError) {
      throw new Error(
        apiError ?? `AbacatePay request failed (${response.status}).`
      );
    }

    return envelope.data;
  }

  async createPixCharge(input: CreatePixChargeInput): Promise<PixCharge> {
    // The v2 `/transparents/create` body is wrapped in a `data` object
    // (`data.amount`, `data.description`, ...) — unlike `/pix/send`, which is
    // flat. Sending a flat body here yields a validation error from the API.
    const data = await this.request<AbacateQRCode>(
      "POST",
      "/transparents/create",
      {
        // Required by the v2 API at the root level (sibling of `data`). Not
        // documented in the SDK types nor in skills/examples — only checkout
        // create mentions `method`; transparent create needs it too.
        method: "PIX",
        data: {
          amount: input.amountCents,
          expiresIn: input.expiresInSeconds,
          description: input.description,
          customer: input.customer,
          metadata: input.metadata,
        },
      }
    );

    return {
      id: data.id,
      status: mapChargeStatus(data.status),
      amountCents: data.amount,
      brCode: data.brCode,
      brCodeBase64: data.brCodeBase64,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    };
  }

  async getPixChargeStatus(chargeId: string): Promise<PixChargeStatus> {
    const data = await this.request<{ status: AbacateQRCode["status"] }>(
      "GET",
      `/transparents/check?id=${encodeURIComponent(chargeId)}`
    );
    return mapChargeStatus(data.status);
  }

  async sendPix(input: SendPixInput): Promise<PixTransfer> {
    // AbacatePay Dev mode supports charge simulation only — `/pix/send` always
    // returns 400 with "Serviço temporariamente indisponível". Fake success so
    // local flows (Me Pergunte repass, refunds, order repass) stay testable.
    if (isAbacatePayDevMode()) {
      return {
        id: buildDevSimulatedTransferId(input.externalId),
        status: "complete",
        amountCents: input.amountCents,
      };
    }

    const data = await this.request<AbacatePixTransaction>("POST", "/pix/send", {
      amount: input.amountCents,
      externalId: input.externalId,
      description: input.description,
      pix: {
        key: normalizePixKey(input.pixKey, input.pixKeyType),
        type: input.pixKeyType,
      },
    });

    return {
      id: data.id,
      status: mapTransferStatus(data.status),
      amountCents: data.amount,
    };
  }

  async simulatePixPayment(chargeId: string): Promise<void> {
    await this.request<AbacateQRCode>(
      "POST",
      `/transparents/simulate-payment?id=${encodeURIComponent(chargeId)}`,
      { metadata: {} }
    );
  }
}
