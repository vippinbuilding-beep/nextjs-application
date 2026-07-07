import type { ProfileLink } from "@/core/models/profile-link";

export interface ProfileLinkInput {
  title: string;
  url: string;
  sortOrder?: number;
  imagePath?: string | null;
  imageMime?: string | null;
}

export interface ProfileLinkRepository {
  listByCreator(creatorId: string): Promise<ProfileLink[]>;
  create(creatorId: string, data: ProfileLinkInput): Promise<ProfileLink>;
  update(id: string, data: Partial<ProfileLinkInput>): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(creatorId: string, orderedIds: string[]): Promise<void>;
}
