import {
  Globe,
  Instagram,
  Linkedin,
  type LucideIcon,
  Music2,
  LayoutDashboard,
  Pencil,
  Twitch,
  Twitter,
  Youtube,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductTabs } from "@/components/products/product-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutBackground } from "@/components/ui/layout-background";
import type { ProductType } from "@/core/models/product";
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
    .select("id, creator_name, slug")
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
    .select("id, creator_name, name, slug, socials")
    .eq("slug", creatorSlug)
    .maybeSingle();

  if (!profile) notFound();

  const { data: rows } = await supabase
    .from("products")
    .select(
      "id, type, title, description, price_cents, slug, thumbnail_path"
    )
    .eq("creator_id", profile.id)
    .order("created_at", { ascending: false });

  const products = rows ?? [];
  const handle = profile.creator_name ?? profile.slug;
  const initial = handle.charAt(0).toUpperCase();
  const isOwner = authUser?.id === profile.id;

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
              <Link href="/profile/edit">
                <Pencil className="size-4" /> Editar perfil
              </Link>
            </Button>
          </div>
        )}
        <CardContent className="flex flex-col gap-6">
          <header className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-20 items-center justify-center rounded-2xl border-2 border-border bg-primary text-3xl font-bold text-primary-foreground shadow-cartoon-lg">
              {initial}
            </span>

            <div className="flex flex-col items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">@{handle}</h1>

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

          <ProductTabs
            products={products.map((product) => ({
              id: product.id,
              title: product.title,
              description: product.description,
              thumbnailPath: product.thumbnail_path,
              slug: product.slug,
              type: product.type as ProductType,
            }))}
            mode="public"
            profile={profile}
          />
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
