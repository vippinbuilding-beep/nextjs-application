import { Pencil } from "lucide-react";
import Link from "next/link";

import { PublicNavBar } from "@/components/navigation/public-nav-bar";
import { ExpandableText } from "@/components/ui/expandable-text";

import { ProductCommentsCard } from "@/components/products/product-comments-card";
import { ProductLessonViewer } from "@/components/products/product-lesson-viewer";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { Button } from "@vippin/ui/button";
import { cn } from "@vippin/ui/lib/utils";

interface ProductLessonLayoutProps {
  productId: string;
  title: string;
  description?: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  bannerAspectRatio: number;
  watermark: string;
  isOwner: boolean;
  hasFile: boolean;
  viewerUserId: string;
  profile: {
    id: string;
    slug: string;
    creatorName: string | null;
    avatarPath: string | null;
    avatarUrl: string | null;
  };
}

/**
 * Twitch-inspired lesson layout: wide video stage, docked chat on desktop,
 * stream info (title + creator) below the player.
 */
export function ProductLessonLayout({
  productId,
  title,
  description,
  mediaUrl,
  thumbnailUrl,
  bannerAspectRatio,
  watermark,
  isOwner,
  hasFile,
  viewerUserId,
  profile,
}: ProductLessonLayoutProps) {
  const handle = profile.creatorName ?? profile.slug;

  return (
    <main className="flex min-h-svh flex-col bg-background">
      <PublicNavBar />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
        {/* Player + stream info */}
        <div className="flex min-w-0 flex-1 flex-col lg:h-svh lg:overflow-y-auto">
          <div className="w-full shrink-0 bg-black">
            {hasFile && mediaUrl ? (
              <ProductLessonViewer
                productId={productId}
                isOwner={isOwner}
                viewerUserId={viewerUserId}
                src={mediaUrl}
                poster={thumbnailUrl}
                watermark={watermark}
                initialAspectRatio={bannerAspectRatio}
                theatre
                className="mx-auto"
              />
            ) : (
              <div className="mx-auto flex aspect-video max-h-[80svh] w-full items-center justify-center px-4 py-16 text-center text-sm text-white/70">
                O conteúdo desta aula ainda não está disponível.
              </div>
            )}
          </div>

          <div className="shrink-0">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 lg:px-6 lg:py-5">



              <div className="flex flex-wrap items-start justify-between flex-col gap-3 w-full">
                <div className="min-w-0 flex-1 space-y-2 w-full">
                  <div className="flex items-center justify-between w-full">
                    <h1 className="text-xl font-bold leading-tight lg:text-2xl">
                      {title}
                    </h1>
                    {isOwner && (
                      <Button asChild size="sm">
                        <Link href={`/products/${productId}/edit`}>
                          <Pencil className="size-4" /> Editar
                        </Link>
                      </Button>
                    )}
                  </div>
                  <CreatorProfileLink
                    userId={profile.id}
                    slug={profile.slug}
                    handle={handle}
                    avatarPath={profile.avatarPath}
                    avatarUrl={profile.avatarUrl}
                    variant="inline"
                  />
                </div>
              </div>

              {description && (
                <ExpandableText
                  text={description}
                  className="text-muted-foreground max-w-3xl text-sm leading-relaxed lg:text-base"
                />
              )}

              <ProductCommentsCard
                productId={productId}
                isOwner={isOwner}
                viewerUserId={viewerUserId}
                formId="comment-body-mobile"
                className="lg:hidden"
              />
            </div>
          </div>
        </div>

        {/* Docked chat — desktop */}
        <aside
          className={cn(
            "hidden lg:flex lg:w-[min(100%,25vw)] lg:shrink-0 lg:flex-col",
            "lg:sticky lg:top-0 lg:h-svh lg:border-l-2 lg:border-border lg:bg-muted/20"
          )}
        >
          <ProductCommentsCard
            productId={productId}
            isOwner={isOwner}
            viewerUserId={viewerUserId}
            variant="sidebar"
            formId="comment-body-sidebar"
            className="min-h-0 flex-1"
          />
        </aside>
      </div>
    </main>
  );
}
