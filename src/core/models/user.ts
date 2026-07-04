/**
 * Domain model for a user.
 *
 * This type is backend-agnostic: it must never import or reference Firebase
 * (or any other infrastructure) types. Infrastructure adapters are responsible
 * for mapping their own shapes to/from this model.
 */

export interface UserSocials {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  x?: string;
  twitch?: string;
}

// Values match the AbacatePay PIX API enum so the stored key type can be sent
// to the payment gateway without any extra mapping.
export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  // Onboarding profile fields
  name?: string;
  birthDate?: string;
  pixKey?: string;
  pixKeyType?: PixKeyType;
  creatorName?: string;
  // Unique public handle derived from the creator name, used to build the
  // public profile link (e.g. /<slug>).
  slug?: string;
  socials?: UserSocials;
  onboardingCompleted?: boolean;
}
