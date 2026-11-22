/**
 * Shipping value objects shared by orders, shipments and the shipping gateway.
 * Backend-agnostic; money in integer cents, documents/CEP/phone as digits only.
 */

export interface ShippingAddress {
  name: string;
  /** CPF (11) or CNPJ (14) digits. */
  document: string;
  /** DDD + number, digits only (10–11). */
  phone: string;
  email?: string;
  /** CEP, 8 digits. */
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  /** UF, 2 uppercase letters. */
  state: string;
}

/** Sender data (creator) — adds the optional Inscrição Estadual. */
export interface ShipFromAddress extends ShippingAddress {
  stateRegister?: string;
}

/** Packed volume. Weight in grams, dimensions in centimeters. */
export interface ShippingPackage {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

/** One freight option returned by a quote. */
export interface ShippingQuoteOption {
  serviceId: number;
  serviceName: string;
  company: string;
  priceCents: number;
  /** Business days, as reported by the carrier. */
  deliveryDays: number;
}

/** Snapshot of the option chosen at checkout (stored on the order). */
export interface ShippingQuoteSnapshot extends ShippingQuoteOption {
  quotedAt: string;
}
