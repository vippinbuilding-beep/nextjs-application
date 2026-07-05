import { Lock } from "lucide-react";

import { PixCheckout } from "@/components/products/pix-checkout";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProductType } from "@/core/models/product";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

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
    <Card className="overflow-hidden">
      <div className="relative">
        <ProductThumbnail
          type={type}
          thumbnailUrl={thumbnailUrl}
          rounded="rounded-t-2xl rounded-b-none"
          className="-mt-6 w-full border-0 border-b-2"
          iconClassName="size-14"
          sizes="(min-width: 672px) 672px, 100vw"
          aspectRatio={bannerAspectRatio}
        />
        <span className="absolute left-3 top-0 flex items-center gap-1.5 rounded-xl border-2 border-border bg-muted px-2.5 py-1 text-xs font-bold shadow-cartoon-sm">
          <Lock className="size-3.5" />
          Conteúdo exclusivo
        </span>
      </div>

      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        {description && (
          <CardDescription className="text-base break-all text-muted-foreground">
            {description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <CreatorProfileLink
          userId={creatorId}
          slug={creatorSlug}
          handle={creatorHandle}
          avatarPath={creatorAvatarPath}
          avatarUrl={creatorAvatarUrl}
        />

        <div className="flex items-center justify-between gap-3 border-none">
          <span className="text-muted-foreground text-sm font-medium">
            {isFree ? "Preço" : "Você paga"}
          </span>
          <span className={cn(
            "text-2xl font-bold",
            isFree && "text-green-500",
          )}>
            {isFree ? "Grátis" : formatBRL(priceCents)}
          </span>
        </div>

        {isFree ? (
          <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted px-6 py-8 text-center">
            <p className="font-bold">Conteúdo gratuito</p>
            <p className="text-muted-foreground text-sm">
              Fale com @{creatorHandle} para garantir seu acesso.
            </p>
          </div>
        ) : (
          <PixCheckout
            productId={productId}
            priceCents={priceCents}
            isAuthenticated={isAuthenticated}
          />
        )}
      </CardContent>
    </Card>
  );
}
