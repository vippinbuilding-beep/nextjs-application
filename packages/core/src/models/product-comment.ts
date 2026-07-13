export interface ProductComment {
  id: string;
  productId: string;
  userId: string;
  parentId?: string;
  body: string;
  createdAt: Date;
  authorSlug?: string;
  authorName?: string;
  authorAvatarPath?: string | null;
  authorAvatarUrl?: string | null;
}
