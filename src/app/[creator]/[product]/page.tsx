import { Download, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductLanding } from "@/components/products/product-landing";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { VideoPlayer } from "@/components/products/video-player";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutBackground } from "@/components/ui/layout-background";
import type { ProductType } from "@/core/models/product";
import { formatFileSize } from "@/lib/products";
import { signMediaToken } from "@/lib/security/media-token";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getProductDownloadUrl,
  getProductMediaUrl,
  getProductThumbnailUrl,
} from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

interface ProductPageProps {
  params: Promise<{ creator: string; product: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { creator, product } = await params;
  const creatorSlug = decodeURIComponent(creator).replace(/^@/, "");
  const productSlug = decodeURIComponent(product);

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, creator_name, slug")
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
    ? getProductThumbnailUrl(row.id)
    : null;

  // Visitors without access only ever see the public sales page — no media
  // tokens are minted for them, so the gated routes stay out of reach.
  if (!canAccess) {
    return (
      <LayoutBackground
        element="main"
        className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
      >
        <div className="flex w-full max-w-xl flex-col gap-6">
          <div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/@${profile.slug}`}>Ver perfil do criador</Link>
            </Button>
          </div>
          <ProductLanding
            productId={row.id}
            type={type}
            title={row.title}
            description={row.description}
            priceCents={row.price_cents ?? 0}
            thumbnailUrl={thumbnailUrl}
            creatorHandle={profile.slug}
            isAuthenticated={Boolean(user)}
          />
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

  return (
    <LayoutBackground element="main" className="p-4 py-10">
      <div className={cn(
        "mx-auto flex w-full max-w-2xl flex-col gap-6",
        type === "single_lesson" && "max-w-4xl"
      )}>
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/@${profile.slug}`}>
              Ver perfil do criador
            </Link>
          </Button>
          {isOwner && (
            <Button asChild variant="default" size="sm">
              <Link href={`/products/${row.id}/edit`}>
                <Pencil className="size-4" /> Editar
              </Link>
            </Button>
          )}
        </div>

        <Card>
          {type === "document" && (
            <ProductThumbnail
              type={type}
              thumbnailUrl={thumbnailUrl}
              rounded="rounded-t-2xl rounded-b-none"
              className="-mt-6 aspect-video w-full border-0 border-b-2"
              iconClassName="size-12"
              sizes="(min-width: 672px) 672px, 100vw"
            />
          )}
          <CardHeader>
            <CardTitle className="text-2xl">{row.title}</CardTitle>
            {row.description && type === "document" && (
              <CardDescription className="text-base break-all text-muted-foreground">
                {row.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent>
            {!hasFile ? (
              <p className="text-muted-foreground text-sm">
                O conteúdo deste produto ainda não está disponível.
              </p>
            ) : type === "single_lesson" ? (
              <VideoPlayer
                src={mediaUrl!}
                productId={row.id}
                poster={thumbnailUrl}
                watermark={`@${profile.slug}`}
              />
            ) : (
              <DocumentBlock
                downloadUrl={downloadUrl!}
                fileName={row.file_name}
                fileSize={row.file_size}
              />
            )}

            {row.description && type === "single_lesson" && (
              <p className="text-base break-all text-muted-foreground mt-5">
                {row.description}
              </p>
            )}
          </CardContent>
        </Card>
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
        <a href={downloadUrl} download={name}>
          <Download className="size-4" /> Baixar documento
        </a>
      </Button>
    </div>
  );
}
