import type { PixKeyType, User, UserSocials } from "../models/user";

export interface ProfileInput {
  name: string;
  birthDate: string;
  pixKey: string;
  pixKeyType: PixKeyType;
  creatorName: string;
  email?: string;
  displayName?: string | null;
}

export interface SocialsInput {
  socials: UserSocials;
}

export interface AvatarMetadata {
  avatarPath: string;
  avatarMime: string;
}

/**
 * Contract for user persistence. The UI and services depend on this interface,
 * never on a concrete backend. Implementations live in `src/infrastructure`.
 */
export interface UserRepository {
  getById(id: string): Promise<User | null>;
  list(): Promise<User[]>;
  upsert(id: string, data: Partial<Omit<User, "id">>): Promise<void>;
  update(id: string, data: Partial<Omit<User, "id" | "createdAt">>): Promise<void>;
  delete(id: string): Promise<void>;
  /**
   * Returns an available unique slug derived from `base` (usually the creator
   * name). It does not persist anything; the caller must save the returned
   * value on the profile.
   */
  generateUniqueSlug(base: string): Promise<string>;
  /**
   * Uploads a profile avatar via a presigned upload URL issued server-side.
   */
  uploadAvatar(userId: string, file: File): Promise<AvatarMetadata>;
}
