"use client";

import { FileText, Link2, PlayCircle } from "lucide-react";

import ProductCard from "@/components/products/product-card";
import { AnimatedHeight } from "@/components/ui/animated-height";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProfileLink } from "@/core/models/profile-link";
import type { ProductType } from "@/core/models/product";
import {
  getAvailableCreatorTabs,
  resolveCreatorDefaultTab,
  type CreatorProfileTab,
} from "@/lib/creator-profile-tabs";

import { CreatorLinkCard } from "./creator-links-list";

interface ProductListItem {
  id: string;
  title: string;
  description?: string;
  thumbnailPath?: string;
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  slug: string;
  type: ProductType;
}

interface CreatorPageTabsProps {
  products: ProductListItem[];
  links: ProfileLink[];
  profile: {
    slug: string;
    id: string;
  };
  mode?: "public" | "manage";
  defaultTab?: CreatorProfileTab | null;
}

/**
 * Creator profile tabs: "Tudo" shows links, lessons and documents together;
 * optional filters per category when more than one type is published.
 */
export function CreatorPageTabs({
  products,
  links,
  profile,
  mode = "public",
  defaultTab,
}: CreatorPageTabsProps) {
  const hasLinks = links.length > 0;
  const lessons = products.filter((product) => product.type === "single_lesson");
  const documents = products.filter((product) => product.type === "document");
  const hasLessons = lessons.length > 0;
  const hasDocuments = documents.length > 0;
  const hasAnyContent = hasLinks || hasLessons || hasDocuments;

  const categoryCount = [hasLinks, hasLessons, hasDocuments].filter(Boolean).length;

  if (!hasAnyContent) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-muted">
          <FileText className="size-6" />
        </span>
        <p className="text-muted-foreground text-sm">
          Nenhum conteúdo publicado ainda.
        </p>
      </div>
    );
  }

  if (categoryCount <= 1) {
    return (
      <CreatorFeed
        links={hasLinks ? links : []}
        products={products}
        profile={profile}
        mode={mode}
        layout="unified"
      />
    );
  }

  const tabs = getAvailableCreatorTabs({
    hasLinks,
    hasLessons,
    hasDocuments,
  });

  const defaultValue = resolveCreatorDefaultTab(defaultTab, tabs);

  if (!defaultValue) {
    return null;
  }

  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList className="max-w-none">
        {tabs.includes("lessons") && (
          <TabsTrigger value="lessons">
            <PlayCircle className="size-4" />
            Aulas
          </TabsTrigger>
        )}
        {tabs.includes("documents") && (
          <TabsTrigger value="documents">
            <FileText className="size-4" />
            Vips
          </TabsTrigger>
        )}
        {tabs.includes("links") && (
          <TabsTrigger value="links">
            <Link2 className="size-4" />
            Links
          </TabsTrigger>
        )}
      </TabsList>

      <AnimatedHeight>
        {hasLessons && (
          <TabsContent value="lessons">
            <CreatorFeed
              links={[]}
              products={lessons}
              profile={profile}
              mode={mode}
              layout="lessons-grid"
              emptyLabel="Nenhuma aula publicada ainda."
            />
          </TabsContent>
        )}
        {hasLinks && (
          <TabsContent value="links">
            <CreatorFeed
              links={links}
              products={[]}
              profile={profile}
              mode={mode}
              layout="unified"
              emptyLabel="Nenhum link publicado ainda."
            />
          </TabsContent>
        )}
        {hasDocuments && (
          <TabsContent value="documents">
            <CreatorFeed
              links={[]}
              products={documents}
              profile={profile}
              mode={mode}
              layout="unified"
              emptyLabel="Nenhum vip publicado ainda."
            />
          </TabsContent>
        )}
      </AnimatedHeight>
    </Tabs>
  );
}

function CreatorFeed({
  links,
  products,
  profile,
  mode,
  layout,
  emptyLabel = "Nenhum conteúdo nesta categoria.",
}: {
  links: ProfileLink[];
  products: ProductListItem[];
  profile: CreatorPageTabsProps["profile"];
  mode: "public" | "manage";
  layout: "unified" | "lessons-grid";
  emptyLabel?: string;
}) {
  if (links.length === 0 && products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-muted">
          <FileText className="size-6" />
        </span>
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      </div>
    );
  }

  const productListClassName =
    layout === "lessons-grid"
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
      : "flex flex-col gap-3";

  return (
    <div className="flex flex-col gap-3">
      {links.length > 0 && (
        <ul className="flex flex-col gap-3">
          {links.map((link) => (
            <li key={`link-${link.id}`}>
              <CreatorLinkCard link={link} />
            </li>
          ))}
        </ul>
      )}

      {products.length > 0 && (
        <ul className={productListClassName}>
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                profile={profile}
                type={product.type}
                mode={mode}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
