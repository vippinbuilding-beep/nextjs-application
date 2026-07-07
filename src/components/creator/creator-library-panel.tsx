"use client";

import { useCallback, useEffect, useState } from "react";

import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { ProductFeed } from "@/components/products/product-feed";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { ScreenLoading } from "@/components/ui/screen-loading";
import type { ProductWithCreator } from "@/core/repositories/product-repository";
import {
  productAccessRepository,
  productRepository,
} from "@/services/repository-factory";

export function CreatorLibraryPanel() {
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<ProductWithCreator[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const productIds = await productAccessRepository.listProductIdsForCurrentUser();
      const list = await productRepository.listByIds(productIds);
      setProducts(list);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void loadProducts();
  }, [user?.id, loadProducts]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  return (
    <div className="flex flex-col gap-6">
      <CreatorModuleHeader
        title="Biblioteca"
        description="Aulas e materiais que você comprou ou recebeu de outros criadores."
      />

      <Card>
        <CardHeader>
          <CardTitle>Meus produtos</CardTitle>
          <CardDescription>
            Acesse o conteúdo adquirido a qualquer momento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loading />
            </div>
          ) : (
            <ProductFeed
              products={products}
              emptyLabel="Você ainda não tem nenhum produto na sua biblioteca."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
