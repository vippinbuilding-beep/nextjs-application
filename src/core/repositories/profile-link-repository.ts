import type { ProfileLink } from "@/core/models/profile-link";

export interface ProfileLinkInput {
  title: string;
  url: string;
  sortOrder?: number;
}

export interface ProfileLinkImageMetadata {
  imagePath: string;
  imageMime: string;
}

export interface ProfileLinkRepository {
  listByCreator(creatorId: string): Promise<ProfileLink[]>;
  create(creatorId: string, data: ProfileLinkInput): Promise<ProfileLink>;
  update(
    id: string,
    data: Partial<ProfileLinkInput & ProfileLinkImageMetadata>
  ): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(creatorId: string, orderedIds: string[]): Promise<void>;
  uploadImage(linkId: string, file: File): Promise<ProfileLinkImageMetadata>;
}
