"use client";

import { ProductCommentsPanel } from "@/components/products/product-comments-panel";
import { VideoPlayer } from "@/components/products/video-player";

interface ProductLessonViewerProps {
  productId: string;
  isOwner: boolean;
  viewerUserId?: string;
  src: string;
  poster?: string | null;
  watermark?: string;
  className?: string;
  /** Twitch-style full-bleed player without card chrome. */
  theatre?: boolean;
  initialAspectRatio?: number;
}

export function ProductLessonViewer({
  productId,
  isOwner,
  viewerUserId,
  src,
  poster,
  watermark,
  className,
  theatre = false,
  initialAspectRatio,
}: ProductLessonViewerProps) {
  return (
    <VideoPlayer
      src={src}
      productId={productId}
      poster={poster}
      watermark={watermark}
      className={className}
      theatre={theatre}
      initialAspectRatio={initialAspectRatio}
      commentsSlot={
        <ProductCommentsPanel
          productId={productId}
          isOwner={isOwner}
          viewerUserId={viewerUserId}
          formId="comment-body-player"
        />
      }
    />
  );
}

