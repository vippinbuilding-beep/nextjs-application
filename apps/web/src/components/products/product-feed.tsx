import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

import type { ProductType } from "@vippin/core/models/product";
import type { ProductWithCreator } from "@vippin/core/repositories/product-repository";
import { formatBRL } from "@vippin/core/domain/money";
import { productAspectRatio } from "@/lib/media-dimensions";
import { PRODUCT_TYPES } from "@/lib/products";
import { getProductThumbnailUrl } from "@/lib/supabase/storage";
import { cn } from "@vippin/ui/lib/utils";

import { ProductThumbnail } from "./product-thumbnail";

interface ProductFeedProps {
  products: ProductWithCreator[];
  emptyLabel?: string;
  /** Highlights price on cards (explore feed). */
  emphasizePrice?: boolean;
  /** Uses a wider multi-column grid (explore full-screen layout). */
  wideGrid?: boolean;
}

/**
 * Lists products from multiple creators (explore feed or consumer library).
 */
export function ProductFeed({
  products,
  emptyLabel = "Nenhum produto encontrado.",
  emphasizePrice = false,
  wideGrid = false,
}: ProductFeedProps) {
  if (!products.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-muted">
          <FileText className="size-6" />
        </span>
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      </div>
    );
  }

  const lessons = products.filter((item) => item.type === "single_lesson");
  const documents = products.filter((item) => item.type === "document");

  return (
    <div className="flex flex-col gap-6">
      {lessons.length > 0 && (
        <section className="flex flex-col gap-3">
          {documents.length > 0 && (
            <h3 className="text-sm font-bold uppercase tracking-wide">Aulas</h3>
          )}
          <ul
            className={cn(
              "grid grid-cols-1 gap-4",
              wideGrid
                ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "sm:grid-cols-2"
            )}
          >
            {lessons.map((item) => (
              <li key={item.id}>
                <ProductFeedCard item={item} emphasizePrice={emphasizePrice} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {documents.length > 0 && (
        <section className="flex flex-col gap-3">
          {lessons.length > 0 && (
            <h3 className="text-sm font-bold uppercase tracking-wide">Vips</h3>
          )}
          <ul className="flex flex-col gap-3">
            {documents.map((item) => (
              <li key={item.id}>
                <ProductFeedCard item={item} emphasizePrice={emphasizePrice} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProductPriceBadge({
  cents,
  size = "md",
  className,
}: {
  cents: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const isFree = cents <= 0;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg border-2 border-border font-bold shadow-cartoon-sm",
        size === "lg" && "px-3 py-1.5 text-base",
        size === "md" && "px-2.5 py-1 text-sm",
        size === "sm" && "px-2 py-0.5 text-xs",
        isFree
          ? "bg-muted text-foreground"
          : "bg-primary text-primary-foreground",
        className
      )}
    >
      {isFree ? "Grátis" : formatBRL(cents)}
    </span>
  );
}

function ProductFeedCard({
  item,
  emphasizePrice,
}: {
  item: ProductWithCreator;
  emphasizePrice: boolean;
}) {
  const thumbnailUrl = item.thumbnailPath
    ? getProductThumbnailUrl(item.id)
    : null;
  const href = `/@${item.creator.slug}/${item.slug}`;

  if (item.type === "document") {
    return (
      <Link
        href={href}
        className="group flex items-center gap-4 rounded-xl border-2 border-border bg-background p-4 shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon"
      >
        <ProductThumbnail
          type={item.type}
          thumbnailUrl={thumbnailUrl}
          className="size-14 shrink-0"
          sizes="56px"
        />

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 font-bold leading-snug">{item.title}</span>
          <span className="text-muted-foreground text-xs font-medium">
            {item.creator.handle}
          </span>
          {!emphasizePrice && (
            <span className="text-muted-foreground text-xs font-medium">
              {PRODUCT_TYPES[item.type].shortLabel}
            </span>
          )}
        </span>

        <span className="flex shrink-0 flex-col items-end gap-2">
          <ProductPriceBadge
            cents={item.priceCents}
            size={emphasizePrice ? "lg" : "md"}
          />
          <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    );
  }

  const bannerAspectRatio = productAspectRatio({
    thumbnailWidth: item.thumbnailWidth,
    thumbnailHeight: item.thumbnailHeight,
    mediaWidth: item.mediaWidth,
    mediaHeight: item.mediaHeight,
  });

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-background shadow-cartoon-sm transition-all hover:-translate-y-1 hover:shadow-cartoon"
    >
      <span className="relative block">
        <ProductThumbnail
          type={item.type as ProductType}
          thumbnailUrl={thumbnailUrl}
          className="w-full rounded-none border-0 border-b-2"
          iconClassName="size-10"
          sizes="(min-width: 640px) 45vw, 100vw"
          aspectRatio={bannerAspectRatio}
        />
        {emphasizePrice && (
          <ProductPriceBadge
            cents={item.priceCents}
            size="lg"
            className="absolute top-3 right-3"
          />
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <span className="line-clamp-2 text-base leading-snug font-bold">
          {item.title}
        </span>

        <span className="text-muted-foreground truncate text-xs font-medium">
          {item.creator.handle}
        </span>

        {item.description ? (
          <span className="text-muted-foreground line-clamp-2 text-xs font-medium">
            {item.description}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs font-medium">
            {PRODUCT_TYPES[item.type].shortLabel}
          </span>
        )}

        {!emphasizePrice && (
          <span className="flex justify-end">
            <ProductPriceBadge cents={item.priceCents} size="sm" />
          </span>
        )}
      </span>
    </Link>
  );
}
