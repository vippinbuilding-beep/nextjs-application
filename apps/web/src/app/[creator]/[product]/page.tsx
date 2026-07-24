import { Download, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExpandableText } from "@/components/ui/expandable-text";
import { ProductCommentsCard } from "@/components/products/product-comments-card";
import { PublicNavBar } from "@/components/navigation/public-nav-bar";
import { ProductLanding } from "@/components/products/product-landing";
import { ProductLessonLayout } from "@/components/products/product-lesson-layout";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { Button } from "@vippin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";
import type { ProductType } from "@vippin/core/models/product";
import { formatFileSize } from "@/lib/products";
import { productAspectRatio } from "@/lib/media-dimensions";
import { createProductMetadata } from "@/lib/metadata";
import { signMediaToken } from "@/lib/security/media-token";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";
import {
  getProductDownloadUrl,
  getProductMediaUrl,
  getProductThumbnailUrl,
} from "@/lib/supabase/storage";

interface ProductPageProps {
  params: Promise<{ creator: string; product: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { creator, product } = await params;
  const creatorSlug = decodeURIComponent(creator).replace(/^@/, "");
  const productSlug = decodeURIComponent(product);

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, creator_name, slug, avatar_path, avatar_url")
    .eq("slug", creatorSlug)
    .maybeSingle();

  if (!profile) {
    return { title: "Produto não encontrado" };
  }

  const { data: row } = await supabase
    .from("products")
    .select("id, title, description, price_cents, slug, thumbnail_path, type")
    .eq("creator_id", profile.id)
    .eq("slug", productSlug)
    .maybeSingle();

  if (!row) {
    return { title: "Produto não encontrado" };
  }

  return createProductMetadata({
    title: row.title,
    description: row.description,
    priceCents: row.price_cents ?? 0,
    creatorHandle: profile.creator_name ?? profile.slug,
    creatorSlug: profile.slug,
    productSlug: row.slug,
    productId: row.id,
    thumbnailPath: row.thumbnail_path,
    type: row.type as ProductType,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { creator, product } = await params;
  const creatorSlug = decodeURIComponent(creator).replace(/^@/, "");
  const productSlug = decodeURIComponent(product);

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, creator_name, slug, avatar_path, avatar_url")
    .eq("slug", creatorSlug)
    .maybeSingle();

  if (!profile) notFound();

  const { data: row } = await supabase
    .from("products")
    .select("*")
    .eq("creator_id", profile.id)
    .eq("slug", productSlug)
    .maybeSingle();

  if (!row) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;

  const type = row.type as ProductType;

  // Access gate: the creator always sees their own product; everyone else needs
  // an entitlement row in `product_accesses`. RLS scopes the query to the
  // caller's own grants, so this only returns a row when the viewer owns it.
  let hasEntitlement = false;
  if (user && !isOwner) {
    const { count } = await supabase
      .from("product_accesses")
      .select("product_id", { count: "exact", head: true })
      .eq("product_id", row.id);
    hasEntitlement = (count ?? 0) > 0;
  }
  const canAccess = isOwner || hasEntitlement;

  const thumbnailUrl = row.thumbnail_path
    ? getProductThumbnailUrl(row.id, row.thumbnail_path)
    : null;
  const bannerAspectRatio = productAspectRatio({
    thumbnailWidth: row.thumbnail_width,
    thumbnailHeight: row.thumbnail_height,
    mediaWidth: row.media_width,
    mediaHeight: row.media_height,
  });

  // Visitors without access only ever see the public sales page — no media
  // tokens are minted for them, so the gated routes stay out of reach.
  if (!canAccess) {
    return (
      <LayoutBackground
        element="main"
        className="flex min-h-svh flex-col"
      >
        <PublicNavBar backFallback={`/@${profile.slug}`} sticky={false} />
        <div className="flex flex-1 flex-col items-center justify-center p-4 py-10">
          <div className="flex w-full max-w-4xl flex-col gap-6">
            <ProductLanding
              productId={row.id}
              type={type}
              title={row.title}
              description={row.description}
              priceCents={row.price_cents ?? 0}
              thumbnailUrl={thumbnailUrl}
              bannerAspectRatio={bannerAspectRatio}
              creatorId={profile.id}
              creatorSlug={profile.slug}
              creatorHandle={profile.creator_name ?? profile.slug}
              creatorAvatarPath={profile.avatar_path}
              creatorAvatarUrl={profile.avatar_url}
              isAuthenticated={Boolean(user)}
            />
          </div>
        </div>
      </LayoutBackground>
    );
  }

  const hasFile = Boolean(row.file_path);

  // Short-lived, signed access to the gated media/download routes. The raw
  // storage path is never sent to the browser.
  //
  // The video token lasts a viewing session: the media route redirects to a
  // ~6h signed URL, and some browsers re-issue the original request for later
  // Range/seek requests, so a 5-minute token would break playback mid-lesson.
  const mediaUrl = hasFile
    ? getProductMediaUrl(row.id, signMediaToken(row.id, "media", 60 * 60 * 6))
    : null;
  const downloadUrl = hasFile
    ? getProductDownloadUrl(row.id, signMediaToken(row.id, "download"))
    : null;

  const isLesson = type === "single_lesson";

  if (isLesson && canAccess) {
    return (
      <ProductLessonLayout
        productId={row.id}
        title={row.title}
        description={row.description}
        mediaUrl={hasFile ? mediaUrl : null}
        thumbnailUrl={thumbnailUrl}
        bannerAspectRatio={bannerAspectRatio}
        watermark={`@${profile.slug}`}
        isOwner={isOwner}
        hasFile={hasFile}
        viewerUserId={user!.id}
        profile={{
          id: profile.id,
          slug: profile.slug,
          creatorName: profile.creator_name,
          avatarPath: profile.avatar_path,
          avatarUrl: profile.avatar_url,
        }}
      />
    );
  }

  return (
    <LayoutBackground
      element="main"
      className="flex min-h-svh flex-col"
    >
      <PublicNavBar backFallback={`/@${profile.slug}`} sticky={false} />
      <div className="flex-1 p-4 py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:items-start">
            <Card>
              {type === "document" && (
                <ProductThumbnail
                  type={type}
                  thumbnailUrl={thumbnailUrl}
                  rounded="rounded-t-2xl rounded-b-none"
                  className="-mt-6 w-full border-0 border-b-2"
                  iconClassName="size-12"
                  sizes="(min-width: 672px) 672px, 100vw"
                  aspectRatio={bannerAspectRatio}
                />
              )}

              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <CardTitle>{row.title}</CardTitle>
                    <CreatorProfileLink
                      userId={profile.id}
                      slug={profile.slug}
                      handle={profile.creator_name ?? profile.slug}
                      avatarPath={profile.avatar_path}
                      avatarUrl={profile.avatar_url}
                      variant="inline"
                    />
                  </div>
                  {isOwner && (
                    <Button asChild variant="default" size="sm" className="shrink-0">
                      <Link href={`/products/${row.id}/edit`}>
                        <Pencil className="size-4" /> Editar
                      </Link>
                    </Button>
                  )}
                </div>
                {row.description && type === "document" && (
                  <CardDescription className="text-base text-muted-foreground">
                    <ExpandableText text={row.description} />
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent>
                {!hasFile ? (
                  <p className="text-muted-foreground text-sm">
                    O conteúdo deste produto ainda não está disponível.
                  </p>
                ) : type === "document" ? (
                  <DocumentBlock
                    downloadUrl={downloadUrl!}
                    fileName={row.file_name}
                    fileSize={row.file_size}
                  />
                ) : null}
              </CardContent>
            </Card>

            <ProductCommentsCard
              productId={row.id}
              isOwner={isOwner}
              viewerUserId={user!.id}
              className="hidden lg:flex"
            />
          </div>

          {type === "document" && (
            <ProductCommentsCard
              productId={row.id}
              isOwner={isOwner}
              viewerUserId={user!.id}
              className="lg:hidden"
            />
          )}
        </div>
      </div>
    </LayoutBackground>
  );
}

function DocumentBlock({
  downloadUrl,
  fileName,
  fileSize,
}: {
  downloadUrl: string;
  fileName: string | null;
  fileSize: number | null;
}) {
  const name = fileName ?? "documento";

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border bg-background px-6 py-10 text-center">
      <div className="flex flex-col gap-1">
        <p className="font-bold break-all">{name}</p>
        {fileSize != null && (
          <p className="text-muted-foreground text-sm font-medium">
            {formatFileSize(fileSize)}
          </p>
        )}
      </div>
      <Button asChild className="w-full max-w-xs">
        <Link href={downloadUrl} download={name}>
          <Download className="size-4" /> Baixar documento
        </Link>
      </Button>
    </div>
  );
}
