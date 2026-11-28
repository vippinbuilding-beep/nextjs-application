import Link from "next/link";

import { ProductType } from "@vippin/core/models/product";
import { formatBRL } from "@vippin/core/domain/money";
import { PRODUCT_TYPES } from "@/lib/products";
import { getProductThumbnailUrl } from "@/lib/supabase/storage";

import { TiltSurface } from "@vippin/ui/tilt-surface";

import { ProductThumbnail } from "./product-thumbnail";

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
        /** Shown under the title when given (0 = "Grátis"). */
        priceCents?: number | null;
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
    /** Shows a "Cancelado" badge in `manage` mode when the product isn't active. */
    status?: "active" | "cancelled";
}

/** Fixed ratio so the storefront grid stays even, whatever the cover size. */
const COVER_RATIO = 4 / 3;

/**
 * Product in a storefront grid (Espectro 2): big rounded cover with the type,
 * title and price below, no box around it. Only the cover moves on hover: it
 * lifts and, with a mouse, tilts toward the cursor with a light reflection.
 */
const ProductCard = ({ product, profile, type, mode = "public", status }: ProductCardProps) => {
    const thumbnailUrl = product.thumbnailPath
        ? getProductThumbnailUrl(product.id, product.thumbnailPath)
        : null;
    const href =
        mode === "manage"
            ? `/products/${product.id}/edit`
            : `/@${profile.slug}/${product.slug}`;
    const showCancelledBadge = mode === "manage" && status === "cancelled";
    const price =
        product.priceCents == null
            ? null
            : product.priceCents <= 0
              ? "Grátis"
              : formatBRL(product.priceCents);

    return (
        <Link
            href={href}
            className="group flex flex-col gap-4 rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
        >
            <TiltSurface className="group-hover:-translate-y-1.5">
                <span
                    aria-hidden
                    className="shadow-elevated-lg absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-[260ms] group-hover:opacity-100"
                />
                <ProductThumbnail
                    type={type}
                    thumbnailUrl={thumbnailUrl}
                    rounded="rounded-3xl"
                    className="relative w-full border-0"
                    iconClassName="size-10"
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 100vw"
                    aspectRatio={COVER_RATIO}
                />
                <span className="bg-card/90 text-card-foreground absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-medium">
                    {PRODUCT_TYPES[type].shortLabel}
                </span>
            </TiltSurface>

            <span className="flex min-w-0 flex-col gap-1 px-1">
                <span className="flex items-start gap-2">
                    <span className="line-clamp-2 text-lg font-semibold leading-snug">{product.title}</span>
                    {showCancelledBadge && (
                        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
                            Cancelado
                        </span>
                    )}
                </span>
                {price && <span className="text-muted-foreground">{price}</span>}
            </span>
        </Link>
    );
};

export default ProductCard;
