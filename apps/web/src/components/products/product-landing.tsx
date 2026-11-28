import { ArrowRight, Lock, Package, PackageX, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ExpandableText } from "@/components/ui/expandable-text";
import { FreeProductClaim } from "@/components/products/free-product-claim";
import { Button } from "@vippin/ui/button";
import { PriceTransparency } from "@/components/products/price-transparency";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { SellerInfo, type PublicSellerInfo } from "@/components/products/seller-info";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import type { ProductType, ShippingMode } from "@vippin/core/models/product";
import { formatBRL } from "@vippin/core/domain/money";
import { cn } from "@vippin/ui/lib/utils";

interface ProductLandingProps {
  productId: string;
  productSlug: string;
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
  /** Physical products: freight payer and stock. */
  physical?: {
    shippingMode: ShippingMode;
    inStock: boolean;
    /** Seller can receive new orders (profile, terms, PF monthly limit). */
    available?: boolean;
    seller?: PublicSellerInfo | null;
  };
  /** Creator viewing their own physical product page. */
  isOwner?: boolean;
}

/**
 * Public sales page shown to visitors who don't own the product. It exposes
 * only the product's public info (title, description, thumbnail, price) and the
 * PIX checkout — never the paid content.
 */
export function ProductLanding({
  productId,
  productSlug,
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
  physical,
  isOwner = false,
}: ProductLandingProps) {
  const isFree = priceCents <= 0;
  const isPhysical = type === "physical";
  const checkoutHref = `/@${creatorSlug}/${productSlug}/checkout`;
  const inStock = physical?.inStock ?? false;
  const available = physical?.available ?? true;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start lg:grid-cols-[minmax(0,1fr)_23rem]">
      <Card className="overflow-hidden">
        <div className="relative">
          <ProductThumbnail
            type={type}
            thumbnailUrl={thumbnailUrl}
            rounded="rounded-t-2xl rounded-b-none"
            className="-mt-6 w-full border-0 border-b"
            iconClassName="size-16"
            sizes="(min-width: 1024px) 640px, 100vw"
            aspectRatio={bannerAspectRatio ?? 16 / 9}
          />
          <span className="absolute left-3 top-0 flex items-center gap-1.5 rounded-xl border border-border bg-muted px-2 py-1 text-xs font-bold shadow-elevated-sm sm:px-2.5">
            {isPhysical ? (
              <Package className="size-3.5 shrink-0" />
            ) : (
              <Lock className="size-3.5 shrink-0" />
            )}
            <span className="whitespace-nowrap">
              {isPhysical ? "Produto físico" : "Conteúdo exclusivo"}
            </span>
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

          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3 sm:gap-3 sm:px-4">
            <span className="text-muted-foreground min-w-0 truncate text-sm font-medium">
              {isPhysical
                ? physical?.shippingMode === "free"
                  ? "Preço (frete grátis)"
                  : "Preço + frete"
                : isFree
                  ? "Preço"
                  : "Você paga"}
            </span>
            <span className={cn(
              "shrink-0 text-xl font-bold sm:text-2xl",
              isFree && "text-success",
            )}>
              {isFree ? "Grátis" : formatBRL(priceCents)}
            </span>
          </div>

          {isPhysical && isOwner ? (
            <Button asChild variant="outline">
              <Link href={`/products/${productId}/edit`}>
                <Pencil className="size-4" /> Editar produto
              </Link>
            </Button>
          ) : isPhysical && !inStock ? (
            <UnavailableNotice title="Esgotado" text="Este produto está sem estoque no momento." />
          ) : isPhysical && !available ? (
            <UnavailableNotice
              title="Indisponível no momento"
              text="Este produto não está aceitando novos pedidos agora. Tente novamente mais tarde."
            />
          ) : isFree ? (
            <FreeProductClaim
              productId={productId}
              isAuthenticated={isAuthenticated}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <Button asChild size="lg" className="group">
                <Link href={checkoutHref}>
                  {isPhysical ? "Comprar" : `Comprar por ${formatBRL(priceCents)}`}
                  <ArrowRight className="size-5 transition-transform duration-200 ease-spring group-hover:translate-x-1" />
                </Link>
              </Button>
              <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                <ShieldCheck className="size-3.5" />
                {isPhysical ? "Pagamento com PIX e compra protegida" : "Pagamento com PIX e acesso imediato"}
              </p>
            </div>
          )}

          {isPhysical && (
            <SellerInfo seller={physical?.seller ?? null} creatorSlug={creatorSlug} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UnavailableNotice({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-muted flex flex-col items-center gap-2 rounded-2xl px-4 py-6 text-center">
      <PackageX className="text-muted-foreground size-6" />
      <p className="font-bold">{title}</p>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}
