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
import { PublicNavBar } from "@/components/navigation/public-nav-bar";
import { CreatorOwnerToolbar } from "@/components/profile/creator-owner-toolbar";
import { CreatorPageTabs } from "@/components/profile/creator-page-tabs";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent } from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";
import type { ProductType } from "@vippin/core/models/product";
import type { ProfileLink } from "@vippin/core/models/profile-link";
import { resolveAskMePriceCents } from "@vippin/core/domain/ask-me";
import { isCreatorProfileTab } from "@/lib/creator-profile-tabs";
import { createCreatorMetadata } from "@/lib/metadata";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";
import Link from "next/link";

interface CreatorPageProps {
  params: Promise<{ creator: string }>;
}

export async function generateMetadata({
  params,
}: CreatorPageProps): Promise<Metadata> {
  const { creator } = await params;
  const creatorSlug = decodeURIComponent(creator).replace(/^@/, "");

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, creator_name, slug, avatar_path, avatar_url")
    .eq("slug", creatorSlug)
    .maybeSingle();

  if (!profile) {
    return { title: "Criador não encontrado" };
  }

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", profile.id);

  return createCreatorMetadata({
    handle: profile.creator_name ?? profile.slug,
    slug: profile.slug,
    productCount: count ?? 0,
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
  const creatorSlug = decodeURIComponent(creator).replace(/^@/, "");

  const supabase = await createSupabaseServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, creator_name, name, slug, socials, avatar_path, avatar_url, ask_me_enabled, ask_me_price_cents, bio, profile_default_tab")
    .eq("slug", creatorSlug)
    .maybeSingle();

  if (!profile) notFound();

  const { data: rows } = await supabase
    .from("products")
    .select(
      "id, type, title, description, price_cents, slug, thumbnail_path, thumbnail_width, thumbnail_height, media_width, media_height"
    )
    .eq("creator_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const products = rows ?? [];

  const { data: linkRows } = await supabase
    .from("profile_links")
    .select("id, creator_id, title, url, image_path, image_mime, sort_order, created_at, updated_at")
    .eq("creator_id", profile.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

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
      <div className="flex flex-1 flex-col items-center p-4 py-6 sm:py-8">
        <div className="w-full max-w-md sm:max-w-3xl">
          {isOwner && <CreatorOwnerToolbar />}

          <Card className="w-full">
            <CardContent className="flex flex-col gap-6">
              <header className="flex flex-col items-center gap-3 text-center">
                <UserAvatar
                  userId={profile.id}
                  name={handle}
                  avatarPath={profile.avatar_path}
                  avatarUrl={profile.avatar_url}
                  size="xl"
                />

                <div className="flex flex-col items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight">{handle}</h1>
                  {bio && (
                    <p className="text-muted-foreground max-w-prose text-sm leading-relaxed break-all">
                      {bio}
                    </p>
                  )}
                  {askMeEnabled && (
                    <AskMeProfileButton
                      creatorId={profile.id}
                      creatorName={handle}
                      priceCents={askMePriceCents}
                      isAuthenticated={Boolean(authUser)}
                      isOwner={isOwner}
                    />
                  )}
                </div>

                {socials.length > 0 && (
                  <ul className="flex flex-wrap items-center justify-center gap-2">
                    {socials.map(([key, url]) => {
                      const Icon = SOCIAL_ICONS[key] ?? Globe;
                      return (
                        <li key={key}>
                          <Link
                            href={url}
                            aria-label={SOCIAL_LABELS[key] ?? key}
                            className="flex size-10 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-cartoon"
                          >
                            <Icon className="size-5" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </header>

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
                }))}
                links={links}
                mode="public"
                profile={profile}
                defaultTab={preferredDefaultTab}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutBackground>
  );
}
