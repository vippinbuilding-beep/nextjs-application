/**
 * Domain model for a viewer's progress in a product video.
 */
export interface ProductProgress {
  userId: string;
  productId: string;
  positionSeconds: number;
  durationSeconds?: number;
  completed: boolean;
  updatedAt: Date;
}
