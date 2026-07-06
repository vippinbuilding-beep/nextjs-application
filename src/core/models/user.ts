/**
 * Domain model for a user.
 *
 * This type is backend-agnostic: it must never import or reference Firebase
 * (or any other infrastructure) types. Infrastructure adapters are responsible
 * for mapping their own shapes to/from this model.
 */

import type { CreatorProfileTab } from "@/lib/creator-profile-tabs";

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

export type UserRole = "creator" | "consumer";

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  /** Creator: legal/full name. Consumer: always unset — use consumerName. */
  name?: string;
  /** Consumer display name in the app. Creator: always unset — use creatorName. */
  consumerName?: string;
  birthDate?: string;
  pixKey?: string;
  pixKeyType?: PixKeyType;
  /** Creator public handle (brand). */
  creatorName?: string;
  /** Optional public bio shown on the creator profile page (max 120 chars). */
  bio?: string | null;
  // Unique public handle derived from the creator name, used to build the
  // public profile link (e.g. /<slug>).
  slug?: string;
  socials?: UserSocials;
  onboardingCompleted?: boolean;
  role?: UserRole;
  avatarPath?: string | null;
  avatarMime?: string | null;
  /** @deprecated Legacy external URL — new avatars always use avatarPath in Storage. */
  avatarUrl?: string | null;
  /** True when avatar_path was imported from the user's Google account. */
  avatarFromGoogle?: boolean;
  /** Optional paid Q&A ("Me Pergunte"). */
  askMeEnabled?: boolean;
  askMePriceCents?: number | null;
  /** Which public profile tab opens first for visitors. */
  profileDefaultTab?: CreatorProfileTab | null;
}
