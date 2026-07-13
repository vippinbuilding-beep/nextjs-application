import { ProductType } from "@vippin/core/models/product";
import { ProductThumbnail } from "./product-thumbnail";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProductThumbnailUrl } from "@/lib/supabase/storage";
import { productAspectRatio } from "@/lib/media-dimensions";
import { PRODUCT_TYPES } from "@/lib/products";

interface ProductCardProps {
    product: {
        id: string;
        title: string;
        description?: string;
        thumbnailPath?: string;
        thumbnailWidth?: number | null;
        thumbnailHeight?: number | null;
        mediaWidth?: number | null;
        mediaHeight?: number | null;
        slug: string;
    };
    profile: {
        slug: string;
        id: string;
    };
    type: ProductType;
    /**
     * `public` links to the product's public sales page (`/@slug/product-slug`).
     * `manage` links to the creator's edit page for the product instead, for
     * use in the creator's own dashboard.
     */
    mode?: "public" | "manage";
}

/**
 * Renders a product link. Layout changes depending on the product type:
 * - `single_lesson`: a vertical card with a big banner thumbnail on top,
 *   meant to be shown in a grid.
 * - `document`: a compact row with a small thumbnail, meant to be shown in
 *   a list.
 */
const ProductCard = ({ product, profile, type, mode = "public" }: ProductCardProps) => {
    const thumbnailUrl = product.thumbnailPath
        ? getProductThumbnailUrl(product.id)
        : null;
    const bannerAspectRatio = productAspectRatio({
        thumbnailWidth: product.thumbnailWidth,
        thumbnailHeight: product.thumbnailHeight,
        mediaWidth: product.mediaWidth,
        mediaHeight: product.mediaHeight,
    });
    const href =
        mode === "manage"
            ? `/products/${product.id}/edit`
            : `/@${profile.slug}/${product.slug}`;

    if (type === "document") {
        return (
            <Link
                href={href}
                className="group flex items-center gap-4 rounded-xl border-2 border-border bg-background p-4 shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon"
            >
                <ProductThumbnail
                    type={type}
                    thumbnailUrl={thumbnailUrl}
                    className="size-12"
                    sizes="48px"
                />

                <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-bold">{product.title}</span>
                    {product.description ? (
                        <span className="text-muted-foreground line-clamp-1 text-xs font-mediu truncate">
                            {product.description}
                        </span>
                    ) : (
                        <span className="text-muted-foreground text-xs font-medium truncate">
                            {PRODUCT_TYPES[type].shortLabel}
                        </span>
                    )}
                </span>

                <span className="flex shrink-0 items-center gap-2">
                    <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
                </span>
            </Link>
        );
    }

    return (
        <Link
            href={href}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-background shadow-cartoon-sm transition-all hover:-translate-y-1 hover:shadow-cartoon"
        >
            <ProductThumbnail
                type={type}
                thumbnailUrl={thumbnailUrl}
                className="w-full rounded-none border-0 border-b-2"
                iconClassName="size-10"
                sizes="(min-width: 640px) 45vw, 100vw"
                aspectRatio={bannerAspectRatio}
            />

            <span className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
                <span className="line-clamp-2 text-base leading-snug font-bold">
                    {product.title}
                </span>

                {product.description && (
                    <span className="text-muted-foreground line-clamp-2 text-xs font-medium truncate">
                        {product.description}
                    </span>
                )}
            </span>
        </Link>
    )
}


export default ProductCard;