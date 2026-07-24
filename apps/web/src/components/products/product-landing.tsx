import { Lock } from "lucide-react";

import { ExpandableText } from "@/components/ui/expandable-text";
import { FreeProductClaim } from "@/components/products/free-product-claim";
import { PixCheckout } from "@/components/products/pix-checkout";
import { PriceTransparency } from "@/components/products/price-transparency";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import type { ProductType } from "@vippin/core/models/product";
import { formatBRL } from "@vippin/core/domain/money";
import { cn } from "@vippin/ui/lib/utils";

interface ProductLandingProps {
  productId: string;
  type: ProductType;
  title: string;
  description?: string | null;
  priceCents: number;
  thumbnailUrl?: string | null;
  bannerAspectRatio?: number;
  creatorId: string;
  creatorSlug: string;
  creatorHandle: string;
  creatorAvatarPath?: string | null;
  creatorAvatarUrl?: string | null;
  isAuthenticated: boolean;
}

/**
 * Public sales page shown to visitors who don't own the product. It exposes
 * only the product's public info (title, description, thumbnail, price) and the
 * PIX checkout — never the paid content.
 */
export function ProductLanding({
  productId,
  type,
  title,
  description,
  priceCents,
  thumbnailUrl,
  bannerAspectRatio,
  creatorId,
  creatorSlug,
  creatorHandle,
  creatorAvatarPath,
  creatorAvatarUrl,
  isAuthenticated,
}: ProductLandingProps) {
  const isFree = priceCents <= 0;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start lg:grid-cols-[minmax(0,1fr)_23rem]">
      <Card className="overflow-hidden">
        <div className="relative">
          <ProductThumbnail
            type={type}
            thumbnailUrl={thumbnailUrl}
            rounded="rounded-t-2xl rounded-b-none"
            className="-mt-6 w-full border-0 border-b-2"
            iconClassName="size-16"
            sizes="(min-width: 1024px) 640px, 100vw"
            aspectRatio={bannerAspectRatio ?? 16 / 9}
          />
          <span className="absolute left-3 top-0 flex items-center gap-1.5 rounded-xl border-2 border-border bg-muted px-2 py-1 text-xs font-bold shadow-cartoon-sm sm:px-2.5">
            <Lock className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">Conteúdo exclusivo</span>
          </span>
        </div>

        <CardHeader>
          <CardTitle className="text-2xl lg:text-3xl">{title}</CardTitle>
        </CardHeader>

        {description && (
          <CardContent>
            <CardDescription className="text-base text-muted-foreground">
              <ExpandableText text={description} previewLength={360} />
            </CardDescription>
          </CardContent>
        )}
      </Card>

      <Card className="md:sticky md:top-6">
        <CardContent className="flex flex-col gap-5">
          <CreatorProfileLink
            userId={creatorId}
            slug={creatorSlug}
            handle={creatorHandle}
            avatarPath={creatorAvatarPath}
            avatarUrl={creatorAvatarUrl}
          />

          <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-border bg-muted/40 px-3 py-3 sm:gap-3 sm:px-4">
            <span className="text-muted-foreground min-w-0 truncate text-sm font-medium">
              {isFree ? "Preço" : "Você paga"}
            </span>
            <span className={cn(
              "shrink-0 text-xl font-bold sm:text-2xl",
              isFree && "text-green-500",
            )}>
              {isFree ? "Grátis" : formatBRL(priceCents)}
            </span>
          </div>

          {!isFree && <PriceTransparency priceCents={priceCents} />}

          {isFree ? (
            <FreeProductClaim
              productId={productId}
              isAuthenticated={isAuthenticated}
            />
          ) : (
            <PixCheckout
              productId={productId}
              priceCents={priceCents}
              isAuthenticated={isAuthenticated}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
