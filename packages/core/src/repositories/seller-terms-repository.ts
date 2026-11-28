import type { SellerTermsAcceptance } from "../models/seller-terms";

/**
 * Immutable record of the seller accepting the Termos do vendedor. The
 * browser inserts its own acceptance (RLS: only for itself, no update/delete);
 * the server reads it to gate physical sales.
 */
export interface SellerTermsRepository {
  getAcceptance(userId: string, termsVersion: string): Promise<SellerTermsAcceptance | null>;
  /** Idempotent: accepting a version twice returns the first acceptance. */
  accept(userId: string, termsVersion: string): Promise<SellerTermsAcceptance>;
}
