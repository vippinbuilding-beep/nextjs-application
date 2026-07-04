"use client";

import { FileText, MessageSquare, PlayCircle } from "lucide-react";

import { ProductCommentsPanel } from "@/components/products/product-comments-panel";
import { AnimatedHeight } from "@/components/ui/animated-height";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductType } from "@/core/models/product";

interface ProductViewerProps {
  productId: string;
  type: ProductType;
  isOwner: boolean;
  children: React.ReactNode;
}

export function ProductViewer({
  productId,
  type,
  isOwner,
  children,
}: ProductViewerProps) {
  const contentLabel = type === "single_lesson" ? "Aula" : "Documento";
  const ContentIcon = type === "single_lesson" ? PlayCircle : FileText;

  return (
    <Tabs defaultValue="content" className="min-w-0">
      <TabsList className="sm:max-w-md max-w-none">
        <TabsTrigger value="content">
          <ContentIcon className="size-4" />
          {contentLabel}
        </TabsTrigger>
        <TabsTrigger value="comments">
          <MessageSquare className="size-4" />
          Comentários
        </TabsTrigger>
      </TabsList>

      <AnimatedHeight>
        <TabsContent value="content" className="min-w-0">
          {children}
        </TabsContent>
        <TabsContent value="comments" className="min-w-0">
          <ProductCommentsPanel productId={productId} isOwner={isOwner} />
        </TabsContent>
      </AnimatedHeight>
    </Tabs>
  );
}
