"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BackButton } from "@/components/navigation/back-button";
import { CreatorLibraryPanel } from "@/components/creator/creator-library-panel";
import { ProductFeed } from "@/components/products/product-feed";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { Loading } from "@vippin/ui/loading";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import type { ProductWithCreator } from "@vippin/core/repositories/product-repository";
import { isCreator } from "@/lib/user-role";
import {
  productAccessRepository,
  productRepository,
} from "@vippin/supabase/factories/repository-factory";

export default function MyProductsPage() {
  const router = useRouter();
  const redirectToLogin = useLoginRedirect();
  const { user, loading } = useAuth();

  const [products, setProducts] = useState<ProductWithCreator[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      redirectToLogin();
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [loading, user, router, redirectToLogin]);

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
    if (!user?.id || !user.onboardingCompleted) return;
    void loadProducts();
  }, [user, loadProducts]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  // Creators get the dashboard shell's header/nav (via CreatorDashboardGate);
  // this bare panel is meant to render inside it.
  if (isCreator(user)) {
    return <CreatorLibraryPanel />;
  }

  return (
    <LayoutBackground
      element="main"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <div className="flex w-full max-w-md flex-col gap-6 sm:max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Meus produtos</CardTitle>
            <CardDescription>
              Aulas e materiais que você comprou ou recebeu acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loading />
              </div>
            ) : (
              <ProductFeed
                products={products}
                emptyLabel="Você ainda não tem nenhum produto na sua biblioteca."
              />
            )}

            <BackButton fallback="/" className="w-full mt-5" />
          </CardContent>
        </Card>
      </div>
    </LayoutBackground>
  );
}
