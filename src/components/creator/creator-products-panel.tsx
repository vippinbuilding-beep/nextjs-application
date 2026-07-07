"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { ProductTabs } from "@/components/products/product-tabs";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { ScreenLoading } from "@/components/ui/screen-loading";
import type { Product } from "@/core/models/product";
import { isCreator } from "@/lib/user-role";
import { productRepository } from "@/services/repository-factory";

export function CreatorProductsPanel() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const loadProducts = useCallback(async (creatorId: string) => {
    setProductsLoading(true);
    try {
      const list = await productRepository.listByCreator(creatorId);
      setProducts(list);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !isCreator(user)) return;
    void loadProducts(user.id);
  }, [user, loadProducts]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  return (
    <div className="flex flex-col gap-6">
      <CreatorModuleHeader
        title="Produtos"
        description="Gerencie aulas e documentos que você vende ou oferece de graça."
      >
        <Button size="sm" onClick={() => router.push("/products/new")}>
          <Plus className="size-4" />
          Novo produto
        </Button>
      </CreatorModuleHeader>

      <Card>
        <CardHeader>
          <CardTitle>Seu catálogo</CardTitle>
          <CardDescription>
            Edite preços, mídia e descrições dos seus conteúdos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loading />
            </div>
          ) : (
            <ProductTabs
              products={products}
              profile={{ id: user.id, slug: user.slug ?? "" }}
              mode="manage"
              emptyLessonsLabel="Você ainda não criou nenhuma aula."
              emptyDocumentsLabel="Você ainda não criou nenhum documento."
              emptyAllLabel="Você ainda não criou nenhuma aula ou documento."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
