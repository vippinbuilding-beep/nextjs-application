import { CheckCircle2, Package, ShieldCheck, Undo2, Zap } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DigitalCheckoutFlow } from "@/components/checkout/digital-checkout-flow";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";

interface CheckoutPageProps {
  params: Promise<{ creator: string; product: string }>;
}

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

/**
 * Checkout de um produto em tela própria. Só PIX (mesmas APIs de antes:
 * `/api/products/[id]/checkout` e `/api/orders/[id]/status`). Quem já tem o
 * produto, o próprio criador ou um produto grátis volta para a página dele.
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

  if (isOwner || priceCents <= 0) redirect(productHref);

  if (user && !isPhysical) {
    // RLS returns only the caller's own grants: a row means they already own it.
    const { count } = await supabase
      .from("product_accesses")
      .select("product_id", { count: "exact", head: true })
      .eq("product_id", row.id);
    if ((count ?? 0) > 0) redirect(productHref);
  }

  const sale = isPhysical ? await loadPhysicalSaleInfo(supabase, row.id, profile.id) : null;
  // Sem estoque ou vendedor indisponível: a página do produto explica o motivo.
  if (isPhysical && ((row.stock ?? 0) <= 0 || !sale?.available)) redirect(productHref);

  const thumbnailUrl = row.thumbnail_path ? getProductThumbnailUrl(row.id, row.thumbnail_path) : null;
  const aspectRatio = productAspectRatio({
    thumbnailWidth: row.thumbnail_width,
    thumbnailHeight: row.thumbnail_height,
    mediaWidth: row.media_width,
    mediaHeight: row.media_height,
  });
  const shippingMode = row.shipping_mode === "free" ? "free" : "buyer_pays";

  const perks = isPhysical
    ? [
        { icon: Package, text: shippingMode === "free" ? "Frete grátis" : "Frete calculado pelo seu CEP" },
        { icon: ShieldCheck, text: "Compra protegida até a entrega" },
        { icon: Undo2, text: "7 dias para desistir depois de receber" },
      ]
    : [
        { icon: Zap, text: "Acesso imediato depois do pagamento" },
        { icon: CheckCircle2, text: "Fica salvo na sua conta" },
        { icon: ShieldCheck, text: "Pagamento seguro com PIX" },
      ];

  return (
    <LayoutBackground element="main" className="flex min-h-svh flex-col">
      <PublicNavBar backFallback={productHref} sticky={false} />
      <div className="flex flex-1 flex-col items-center p-4 py-8 sm:py-10">
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-[minmax(0,1fr)_22rem] md:items-start">
          <Card className="animate-rise order-2 md:order-1">
            <CardHeader>
              <CardTitle className="text-2xl">Finalizar compra</CardTitle>
              <CardDescription>
                {isPhysical ? "Entrega, frete e pagamento com PIX." : "Pagamento com PIX, sem cadastro de cartão."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPhysical ? (
                <PhysicalCheckoutFlow
                  productId={row.id}
                  priceCents={priceCents}
                  shippingMode={shippingMode}
                  isAuthenticated={Boolean(user)}
                />
              ) : (
                <DigitalCheckoutFlow
                  productId={row.id}
                  priceCents={priceCents}
                  isAuthenticated={Boolean(user)}
                  productHref={productHref}
                />
              )}
            </CardContent>
          </Card>

          <Card className="animate-rise order-1 gap-5 overflow-hidden pt-0 md:sticky md:top-6 md:order-2">
            <ProductThumbnail
              type={type}
              thumbnailUrl={thumbnailUrl}
              rounded="rounded-none"
              className="w-full border-0 border-b"
              iconClassName="size-12"
              sizes="(min-width: 768px) 352px, 100vw"
              aspectRatio={aspectRatio ?? 16 / 9}
            />
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  {isPhysical ? "Produto físico" : "Conteúdo digital"}
                </span>
                <p className="text-lg font-bold leading-tight">{row.title}</p>
              </div>

              <CreatorProfileLink
                userId={profile.id}
                slug={profile.slug}
                handle={profile.creator_name ?? profile.slug}
                avatarPath={profile.avatar_path}
                avatarUrl={profile.avatar_url}
              />

              <div className="bg-muted flex items-center justify-between rounded-2xl px-4 py-3">
                <span className="text-muted-foreground text-sm">
                  {isPhysical ? (shippingMode === "free" ? "Preço (frete grátis)" : "Preço + frete") : "Você paga"}
                </span>
                <span className="text-xl font-bold">{formatBRL(priceCents)}</span>
              </div>

              <ul className="flex flex-col gap-2.5 text-sm">
                {perks.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5">
                    <Icon className="text-muted-foreground size-4 shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>

              {isPhysical && <SellerInfo seller={sale?.seller ?? null} creatorSlug={profile.slug} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutBackground>
  );
}
