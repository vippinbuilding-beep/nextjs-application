"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProductFeed } from "@/components/products/product-feed";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutBackground } from "@/components/ui/layout-background";
import { Loading } from "@/components/ui/loading";
import { ScreenLoading } from "@/components/ui/screen-loading";
import type { ProductWithCreator } from "@/core/repositories/product-repository";
import {
  productAccessRepository,
  productRepository,
} from "@/services/repository-factory";

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

            <Button size="sm" variant="outline" className="w-full" onClick={() => router.back()}>
              <ArrowLeft className="size-4" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    </LayoutBackground>
  );
}
