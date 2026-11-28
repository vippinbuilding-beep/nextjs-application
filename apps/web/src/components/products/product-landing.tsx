import { ArrowRight, Lock, Package, PackageX, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ExpandableText } from "@/components/ui/expandable-text";
import { DigitalPixDialog } from "@/components/checkout/digital-pix-dialog";
import { FreeProductClaim } from "@/components/products/free-product-claim";
import { Button } from "@vippin/ui/button";
import { PriceTransparency } from "@/components/products/price-transparency";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { SellerInfo, type PublicSellerInfo } from "@/components/products/seller-info";
import { Card } from "@vippin/ui/card";
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

  const priceLabel = isPhysical
    ? physical?.shippingMode === "free"
      ? "Frete grátis"
      : "Mais o frete, calculado pelo seu CEP"
    : isFree
      ? "Acesso livre com a sua conta"
      : "Pagamento único com Pix";

  return (
    <div className="flex flex-wrap items-start gap-12 lg:gap-16">
      <article className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
        <ProductThumbnail
          type={type}
          thumbnailUrl={thumbnailUrl}
          rounded="rounded-[28px]"
          className="w-full border-0"
          iconClassName="size-16"
          sizes="(min-width: 1024px) 720px, 100vw"
          aspectRatio={bannerAspectRatio ?? 16 / 9}
          priority
          alt={title}
        />

        <div className="flex max-w-[64ch] flex-col gap-6">
          <span className="bg-muted text-muted-foreground flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
            {isPhysical ? <Package className="size-4" /> : <Lock className="size-4" />}
            {isPhysical ? "Produto físico" : "Conteúdo exclusivo"}
          </span>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-balance sm:text-5xl">
            {title}
          </h1>
          <CreatorProfileLink
            userId={creatorId}
            slug={creatorSlug}
            handle={creatorHandle}
            avatarPath={creatorAvatarPath}
            avatarUrl={creatorAvatarUrl}
          />
          {description && (
            <div className="text-muted-foreground text-lg leading-relaxed">
              <ExpandableText text={description} previewLength={360} />
            </div>
          )}
        </div>
      </article>

      <aside aria-label="Comprar" className="w-full flex-[1_1_320px] lg:sticky lg:top-6 lg:max-w-[400px]">
        <Card className="gap-6 px-7 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-1.5">
            <span className={cn("text-4xl font-semibold leading-none tracking-tight", isFree && "text-success")}>
              {isFree ? "Grátis" : formatBRL(priceCents)}
            </span>
            <span className="text-muted-foreground">{priceLabel}</span>
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
          ) : !isPhysical ? (
            <div className="flex flex-col gap-2">
              <DigitalPixDialog
                productId={productId}
                priceCents={priceCents}
                isAuthenticated={isAuthenticated}
              />
              <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                <ShieldCheck className="size-3.5" />
                Pagamento com Pix e acesso imediato
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button asChild size="lg" className="group">
                <Link href={checkoutHref}>
                  Comprar
                  <ArrowRight className="size-5 transition-transform duration-200 ease-spring group-hover:translate-x-1" />
                </Link>
              </Button>
              <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                <ShieldCheck className="size-3.5" />
                Pagamento com Pix e compra protegida
              </p>
            </div>
          )}

          {isPhysical && (
            <SellerInfo seller={physical?.seller ?? null} creatorSlug={creatorSlug} />
          )}
        </Card>
      </aside>
    </div>
  );
}

function UnavailableNotice({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-muted flex flex-col items-center gap-2 rounded-2xl px-4 py-6 text-center">
      <PackageX className="text-muted-foreground size-6" />
      <p className="font-semibold">{title}</p>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}
