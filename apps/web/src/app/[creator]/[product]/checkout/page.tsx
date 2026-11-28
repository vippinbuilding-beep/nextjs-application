import { Package, ShieldCheck, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PhysicalCheckoutFlow } from "@/components/checkout/physical-checkout-flow";
import { PublicNavBar } from "@/components/navigation/public-nav-bar";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { SellerInfo } from "@/components/products/seller-info";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { productAspectRatio } from "@/lib/media-dimensions";
import { loadPhysicalSaleInfo } from "@/lib/shipping/physical-sale-info";
import { getProductThumbnailUrl } from "@/lib/supabase/storage";
import { formatBRL } from "@vippin/core/domain/money";
import type { ProductType } from "@vippin/core/models/product";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";
import { Card } from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { PageShell } from "@vippin/ui/page-shell";

interface CheckoutPageProps {
  params: Promise<{ creator: string; product: string }>;
}

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

/**
 * Checkout de produto físico em tela própria (endereço, frete e Pix). Produto
 * digital paga o Pix numa janela na própria página do produto, então volta
 * para ela; o criador e produtos grátis também.
 */
export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { creator, product } = await params;
  const creatorSlug = decodeURIComponent(creator).replace(/^@/, "");
  const productSlug = decodeURIComponent(product);
  const productHref = `/@${creatorSlug}/${productSlug}`;

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, creator_name, slug, avatar_path, avatar_url")
    .eq("slug", creatorSlug)
    .maybeSingle();
  if (!profile) notFound();

  const { data: row } = await supabase
    .from("products")
    .select(
      "id, slug, title, type, price_cents, thumbnail_path, thumbnail_width, thumbnail_height, media_width, media_height, shipping_mode, stock"
    )
    .eq("creator_id", profile.id)
    .eq("slug", productSlug)
    .maybeSingle();
  if (!row) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const type = row.type as ProductType;
  const isPhysical = type === "physical";
  const priceCents = row.price_cents ?? 0;
  const isOwner = user?.id === profile.id;

  if (isOwner || priceCents <= 0 || !isPhysical) redirect(productHref);

  const sale = await loadPhysicalSaleInfo(supabase, row.id, profile.id);
  // Sem estoque ou vendedor indisponível: a página do produto explica o motivo.
  if ((row.stock ?? 0) <= 0 || !sale.available) redirect(productHref);

  const thumbnailUrl = row.thumbnail_path ? getProductThumbnailUrl(row.id, row.thumbnail_path) : null;
  const aspectRatio = productAspectRatio({
    thumbnailWidth: row.thumbnail_width,
    thumbnailHeight: row.thumbnail_height,
    mediaWidth: row.media_width,
    mediaHeight: row.media_height,
  });
  const shippingMode = row.shipping_mode === "free" ? "free" : "buyer_pays";

  const perks = [
    { icon: Package, text: shippingMode === "free" ? "Frete grátis" : "Frete calculado pelo seu CEP" },
    { icon: ShieldCheck, text: "Compra protegida até a entrega" },
    { icon: Undo2, text: "7 dias para desistir depois de receber" },
  ];

  return (
    <LayoutBackground element="main" className="flex min-h-svh flex-col">
      <PublicNavBar backFallback={productHref} sticky={false} />
      <PageShell className="pt-6 sm:pt-8">
        <div className="flex flex-wrap items-start gap-12 lg:gap-20">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-10">
            <div className="flex animate-rise flex-col gap-3">
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
                Finalizar compra
              </h1>
              <p className="text-muted-foreground text-lg">Entrega, frete e pagamento com Pix.</p>
            </div>
            <PhysicalCheckoutFlow
              productId={row.id}
              priceCents={priceCents}
              shippingMode={shippingMode}
              isAuthenticated={Boolean(user)}
            />
          </div>

          <aside aria-label="Resumo do pedido" className="w-full flex-[1_1_320px] lg:sticky lg:top-6 lg:max-w-[380px]">
            <Card className="gap-5 p-6">
              <ProductThumbnail
                type={type}
                thumbnailUrl={thumbnailUrl}
                rounded="rounded-2xl"
                className="w-full border-0"
                iconClassName="size-12"
                sizes="(min-width: 1024px) 332px, 100vw"
                aspectRatio={aspectRatio ?? 16 / 9}
              />
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold leading-snug">{row.title}</p>
                <span className="text-muted-foreground text-sm">Produto físico</span>
              </div>

              <CreatorProfileLink
                userId={profile.id}
                slug={profile.slug}
                handle={profile.creator_name ?? profile.slug}
                avatarPath={profile.avatar_path}
                avatarUrl={profile.avatar_url}
              />

              <div className="border-border flex items-baseline justify-between border-t pt-5">
                <span className="text-muted-foreground">
                  {shippingMode === "free" ? "Preço, com frete grátis" : "Preço, sem o frete"}
                </span>
                <span className="text-xl font-semibold">{formatBRL(priceCents)}</span>
              </div>

              <ul className="text-muted-foreground flex flex-col gap-3 text-sm">
                {perks.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <Icon className="text-ring size-4 shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>

              <SellerInfo seller={sale.seller} creatorSlug={profile.slug} />
            </Card>
          </aside>
        </div>
      </PageShell>
    </LayoutBackground>
  );
}
