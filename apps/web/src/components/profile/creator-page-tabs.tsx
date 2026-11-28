"use client";

import { FileText, Link2, PlayCircle } from "lucide-react";

import ProductCard from "@/components/products/product-card";
import { RevealGroup } from "@vippin/ui/reveal-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@vippin/ui/tabs";
import type { ProfileLink } from "@vippin/core/models/profile-link";
import type { ProductType } from "@vippin/core/models/product";
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
  priceCents?: number | null;
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
  // Physical products are listed together with documents ("Vips").
  const documents = products.filter((product) => product.type !== "single_lesson");
  const hasLessons = lessons.length > 0;
  const hasDocuments = documents.length > 0;
  const hasAnyContent = hasLinks || hasLessons || hasDocuments;

  const categoryCount = [hasLinks, hasLessons, hasDocuments].filter(Boolean).length;

  if (!hasAnyContent) {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <FileText className="text-muted-foreground size-6" />
        <p className="text-muted-foreground">Nenhum conteúdo publicado ainda.</p>
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
    <Tabs defaultValue={defaultValue} className="gap-10">
      <TabsList variant="underline">
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

        {hasLessons && (
          <TabsContent value="lessons">
            <CreatorFeed
              links={[]}
              products={lessons}
              profile={profile}
              mode={mode}
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
              emptyLabel="Nenhum vip publicado ainda."
            />
          </TabsContent>
        )}
    </Tabs>
  );
}

function CreatorFeed({
  links,
  products,
  profile,
  mode,
  emptyLabel = "Nenhum conteúdo nesta categoria.",
}: {
  links: ProfileLink[];
  products: ProductListItem[];
  profile: CreatorPageTabsProps["profile"];
  mode: "public" | "manage";
  emptyLabel?: string;
}) {
  if (links.length === 0 && products.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <FileText className="text-muted-foreground size-6" />
        <p className="text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  // Mesma grade para aulas e materiais: capa grande, título e preço embaixo.
  const productListClassName = "grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="flex flex-col gap-12">
      {links.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <li key={`link-${link.id}`}>
              <CreatorLinkCard link={link} />
            </li>
          ))}
        </ul>
      )}

      {products.length > 0 && (
        // Cards abaixo da dobra entram em cascata ao rolar; os da primeira
        // tela aparecem prontos (LCP).
        <RevealGroup as="ul" className={productListClassName}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              profile={profile}
              type={product.type}
              mode={mode}
            />
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
