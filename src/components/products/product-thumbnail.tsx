import { FileText, PlayCircle } from "lucide-react";
import Image from "next/image";

import type { ProductType } from "@/core/models/product";
import { cn } from "@/lib/utils";

interface ProductThumbnailProps {
  type: ProductType;
  /** Public URL of the uploaded thumbnail, if any. */
  thumbnailUrl?: string | null;
  /** Controls size/shape of the wrapper (must set a height, e.g. `size-12` or `aspect-video`). */
  className?: string;
  iconClassName?: string;
  /** Rounded corners preset; defaults to `rounded-xl`. */
  rounded?: string;
  sizes?: string;
}

/**
 * Shows the product's thumbnail image, or a generic icon based on the
 * product type when no thumbnail was uploaded.
 */
export function ProductThumbnail({
  type,
  thumbnailUrl,
  className,
  iconClassName = "size-6",
  rounded = "rounded-xl",
  sizes = "96px",
}: ProductThumbnailProps) {
  const Icon = type === "single_lesson" ? PlayCircle : FileText;

  if (thumbnailUrl) {
    return (
      <span
        className={cn(
          "relative block shrink-0 overflow-hidden border-2 border-border bg-secondary",
          rounded,
          className
        )}
      >
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center border-2 border-border bg-secondary text-secondary-foreground",
        rounded,
        className
      )}
    >
      <Icon className={iconClassName} />
    </span>
  );
}
