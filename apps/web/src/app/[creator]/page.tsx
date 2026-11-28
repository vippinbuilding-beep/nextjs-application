import {
  Globe,
  Instagram,
  Linkedin,
  type LucideIcon,
  Music2,
  Twitch,
  Twitter,
  Youtube,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AskMeProfileButton } from "@/components/ask-me/ask-me-dialog";
import { VisitTracker } from "@/components/visits/visit-tracker";
import { PublicNavBar } from "@/components/navigation/public-nav-bar";
import { CreatorOwnerToolbar } from "@/components/profile/creator-owner-toolbar";
import { CreatorPageTabs } from "@/components/profile/creator-page-tabs";
import { UserAvatar } from "@/components/ui/user-avatar";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { PageHeader, PageShell } from "@vippin/ui/page-shell";
import type { ProductType } from "@vippin/core/models/product";
import type { ProfileLink } from "@vippin/core/models/profile-link";
import { resolveAskMePriceCents } from "@vippin/core/domain/ask-me";
import { isCreatorProfileTab } from "@/lib/creator-profile-tabs";
import { createCreatorMetadata, toAbsoluteUrl } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { creatorProfileJsonLd } from "@/lib/structured-data";
import {
  getActiveCreatorProducts,
  getPublicProfile,
  getRequestSupabase,
  getRequestUser,
  parseCreatorSlug,
} from "@/lib/public-page-data";
import Link from "next/link";

interface CreatorPageProps {
  params: Promise<{ creator: string }>;
}

export async function generateMetadata({
  params,
}: CreatorPageProps): Promise<Metadata> {
  const { creator } = await params;
  const profile = await getPublicProfile(parseCreatorSlug(creator));

  if (!profile) {
    return { title: "Criador não encontrado" };
  }

  // Mesma lista da página (cache por request): conta só produtos ativos.
  const products = await getActiveCreatorProducts(profile.id);

  return createCreatorMetadata({
    handle: profile.creator_name ?? profile.slug,
    slug: profile.slug,
    productCount: products.length,
    userId: profile.id,
    avatarPath: profile.avatar_path,
    avatarUrl: profile.avatar_url,
  });
}

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  twitch: Twitch,
  x: Twitter,
  tiktok: Music2,
};

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  twitch: "Twitch",
  x: "X",
  tiktok: "TikTok",
};

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { creator } = await params;

  // Perfil e usuário em paralelo; o perfil vem do cache do generateMetadata.
  const [supabase, profile, authUser] = await Promise.all([
    getRequestSupabase(),
    getPublicProfile(parseCreatorSlug(creator)),
    getRequestUser(),
  ]);

  if (!profile) notFound();

  // Produtos (já carregados pelo generateMetadata) e links em paralelo.
  const [products, { data: linkRows }] = await Promise.all([
    getActiveCreatorProducts(profile.id),
    supabase
      .from("profile_links")
      .select("id, creator_id, title, url, image_path, image_mime, sort_order, created_at, updated_at")
      .eq("creator_id", profile.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const links: ProfileLink[] = (linkRows ?? []).map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    url: row.url,
    imagePath: row.image_path ?? undefined,
    imageMime: row.image_mime ?? undefined,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  }));

  const handle = profile.creator_name ?? profile.slug;
  const bio = profile.bio?.trim() || null;
  const isOwner = authUser?.id === profile.id;
  const askMeEnabled = Boolean(profile.ask_me_enabled);
  const askMePriceCents = resolveAskMePriceCents(
    askMeEnabled,
    profile.ask_me_price_cents
  );

  const socials = Object.entries(
    (profile.socials as Record<string, string> | null) ?? {}
  ).filter(([key, value]) => value && SOCIAL_ICONS[key]);

  const preferredDefaultTab =
    profile.profile_default_tab && isCreatorProfileTab(profile.profile_default_tab)
      ? profile.profile_default_tab
      : null;

  return (
    <LayoutBackground
      element="main"
      className="flex min-h-svh flex-col"
    >
      <PublicNavBar backFallback="/explore" sticky={false} />
      <VisitTracker scope="creator" targetId={profile.id} disabled={isOwner} />
      <JsonLd
        data={creatorProfileJsonLd({
          name: profile.creator_name ?? profile.name ?? profile.slug,
          slug: profile.slug,
          bio,
          imageUrl:
            profile.avatar_path || profile.avatar_url
              ? toAbsoluteUrl(`/api/profiles/${profile.id}/avatar`)
              : null,
          sameAs: socials.map(([, url]) => url).filter((url) => /^https?:\/\//.test(url)),
        })}
      />
      <PageShell>
        {isOwner && <CreatorOwnerToolbar />}

        <PageHeader
          glow
          leading={
            <span className="bg-aurora w-fit rounded-full p-[3px]">
              <span className="border-background block rounded-full border-4">
                <UserAvatar
                  userId={profile.id}
                  name={handle}
                  avatarPath={profile.avatar_path}
                  avatarUrl={profile.avatar_url}
                  size="xl"
                />
              </span>
            </span>
          }
          title={handle}
          subtitle={`@${profile.slug}`}
          description={bio ? <p className="break-words">{bio}</p> : undefined}
          actions={
            askMeEnabled || socials.length > 0 ? (
              <div className="flex w-full flex-col gap-4 sm:w-auto sm:items-end">
                {askMeEnabled && (
                  <AskMeProfileButton
                    creatorId={profile.id}
                    creatorName={handle}
                    priceCents={askMePriceCents}
                    isAuthenticated={Boolean(authUser)}
                    isOwner={isOwner}
                  />
                )}
                {socials.length > 0 && (
                  <ul className="flex flex-wrap items-center gap-1">
                    {socials.map(([key, url]) => {
                      const Icon = SOCIAL_ICONS[key] ?? Globe;
                      return (
                        <li key={key}>
                          <Link
                            href={url}
                            aria-label={SOCIAL_LABELS[key] ?? key}
                            className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-11 items-center justify-center rounded-full transition-colors"
                          >
                            <Icon className="size-5" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : undefined
          }
        />

        <CreatorPageTabs
          products={products.map((product) => ({
            id: product.id,
            title: product.title,
            description: product.description,
            thumbnailPath: product.thumbnail_path,
            thumbnailWidth: product.thumbnail_width,
            thumbnailHeight: product.thumbnail_height,
            mediaWidth: product.media_width,
            mediaHeight: product.media_height,
            slug: product.slug,
            type: product.type as ProductType,
            priceCents: product.price_cents,
          }))}
          links={links}
          mode="public"
          profile={profile}
          defaultTab={preferredDefaultTab}
        />
      </PageShell>
    </LayoutBackground>
  );
}
