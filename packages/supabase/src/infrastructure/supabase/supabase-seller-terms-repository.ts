import type { SupabaseClient } from "@supabase/supabase-js";

import type { SellerTermsAcceptance } from "@vippin/core/models/seller-terms";
import type { SellerTermsRepository } from "@vippin/core/repositories/seller-terms-repository";

const TABLE = "seller_terms_acceptances";

type SellerTermsRow = {
  id: string;
  user_id: string;
  terms_version: string;
  accepted_at: string;
};

/**
 * Works with the browser client (RLS: own rows, insert only) and with the
 * service role on the server (eligibility checks).
 */
export class SupabaseSellerTermsRepository implements SellerTermsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAcceptance(
    userId: string,
    termsVersion: string
  ): Promise<SellerTermsAcceptance | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("terms_version", termsVersion)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toAcceptance(data as SellerTermsRow) : null;
  }

  async accept(userId: string, termsVersion: string): Promise<SellerTermsAcceptance> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({ user_id: userId, terms_version: termsVersion })
      .select("*")
      .single();
    if (error) {
      // Already accepted (unique user_id + version): keep the first record.
      if (error.code === "23505") {
        const existing = await this.getAcceptance(userId, termsVersion);
        if (existing) return existing;
      }
      throw new Error("Não foi possível registrar o aceite dos termos. Tente novamente.");
    }
    return toAcceptance(data as SellerTermsRow);
  }
}

function toAcceptance(row: SellerTermsRow): SellerTermsAcceptance {
  return {
    id: row.id,
    userId: row.user_id,
    termsVersion: row.terms_version,
    acceptedAt: new Date(row.accepted_at),
  };
}
