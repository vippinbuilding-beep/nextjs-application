export interface ProfileLink {
  id: string;
  creatorId: string;
  title: string;
  url: string;
  imagePath?: string;
  imageMime?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
