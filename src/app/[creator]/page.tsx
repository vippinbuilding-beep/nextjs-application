import {
  Globe,
  Instagram,
  Linkedin,
  LayoutDashboard,
  Link2,
  type LucideIcon,
  Music2,
  Pencil,
  Twitch,
  Twitter,
  Youtube,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AskMeProfileButton } from "@/components/ask-me/ask-me-dialog";
import { CreatorPageTabs } from "@/components/profile/creator-page-tabs";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutBackground } from "@/components/ui/layout-background";
import type { ProductType } from "@/core/models/product";
import type { ProfileLink } from "@/core/models/profile-link";
import { resolveAskMePriceCents } from "@/lib/ask-me";
import { createCreatorMetadata } from "@/lib/metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    .select("id, creator_name, name, slug, socials, avatar_path, avatar_url, ask_me_enabled, ask_me_price_cents")
    .eq("slug", creatorSlug)
    .maybeSingle();

  if (!profile) notFound();

  const { data: rows } = await supabase
    .from("products")
    .select(
      "id, type, title, description, price_cents, slug, thumbnail_path, thumbnail_width, thumbnail_height, media_width, media_height"
    )
    .eq("creator_id", profile.id)
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
  const isOwner = authUser?.id === profile.id;
  const askMeEnabled = Boolean(profile.ask_me_enabled);
  const askMePriceCents = resolveAskMePriceCents(
    askMeEnabled,
    profile.ask_me_price_cents
  );

  let askerHasPixKey = false;
  if (authUser && !isOwner) {
    const { data: askerProfile } = await supabase
      .from("profiles")
      .select("pix_key")
      .eq("id", authUser.id)
      .maybeSingle();
    askerHasPixKey = Boolean(askerProfile?.pix_key);
  }

  const socials = Object.entries(
    (profile.socials as Record<string, string> | null) ?? {}
  ).filter(([key, value]) => value && SOCIAL_ICONS[key]);

  return (
    <LayoutBackground
      element="main"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <Card className="w-full max-w-md sm:max-w-2xl relative">
        {isOwner && (
          <div className="flex items-center justify-end gap-2 absolute -top-15 sm: right-0">
            <Button size="sm" variant="outline" asChild>
              <Link href="/">
                <LayoutDashboard className="size-4" /> Gerenciar produtos
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/profile/links">
                <Link2 className="size-4" /> Meus links
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/profile/edit">
                <Pencil className="size-4" /> Editar perfil
              </Link>
            </Button>
          </div>
        )}
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
              <h1 className="text-3xl font-bold tracking-tight">@{handle}</h1>
              {askMeEnabled && (
                <AskMeProfileButton
                  creatorId={profile.id}
                  creatorName={handle}
                  priceCents={askMePriceCents}
                  isAuthenticated={Boolean(authUser)}
                  hasPixKey={askerHasPixKey}
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
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={SOCIAL_LABELS[key] ?? key}
                        className="flex size-10 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-cartoon"
                      >
                        <Icon className="size-5" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </header>

          <div className="border-t-2 border-dashed border-border" />

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
          />
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
