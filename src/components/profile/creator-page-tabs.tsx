import { FileText, Link2, PlayCircle } from "lucide-react";

import { ProductTabs } from "@/components/products/product-tabs";
import { AnimatedHeight } from "@/components/ui/animated-height";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProfileLink } from "@/core/models/profile-link";
import type { ProductType } from "@/core/models/product";

import { CreatorLinksList } from "./creator-links-list";

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
}

/**
 * Top-level tabs on a creator profile: products (lessons/docs) and custom links.
 */
export function CreatorPageTabs({
  products,
  links,
  profile,
  mode = "public",
}: CreatorPageTabsProps) {
  const hasProducts = products.length > 0;
  const hasLinks = links.length > 0;

  if (!hasProducts && !hasLinks) {
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

  if (hasProducts && !hasLinks) {
    return (
      <ProductTabs products={products} profile={profile} mode={mode} />
    );
  }

  if (!hasProducts && hasLinks) {
    return <CreatorLinksList links={links} />;
  }

  const defaultTab = hasProducts ? "products" : "links";

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="max-w-none sm:max-w-80">
        <TabsTrigger value="products">
          <PlayCircle className="size-4" />
          Produtos
        </TabsTrigger>
        <TabsTrigger value="links">
          <Link2 className="size-4" />
          Links
        </TabsTrigger>
      </TabsList>

      <AnimatedHeight>
        <TabsContent value="products">
          <ProductTabs
            products={products}
            profile={profile}
            mode={mode}
            emptyAllLabel="Nenhum produto publicado ainda."
          />
        </TabsContent>

        <TabsContent value="links">
          <CreatorLinksList links={links} />
        </TabsContent>
      </AnimatedHeight>
    </Tabs>
  );
}
