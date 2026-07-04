"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductForm } from "@/components/products/product-form";
import { useAuth } from "@/components/providers/auth-provider";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";
import type { Product } from "@/core/models/product";
import { productRepository } from "@/services/repository-factory";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
      return;
    }

    let active = true;
    (async () => {
      try {
        const found = await productRepository.getById(params.id);
        if (!active) return;
        if (!found || found.creatorId !== user.id) {
          router.replace("/");
          return;
        }
        setProduct(found);
      } catch {
        if (active) router.replace("/");
      } finally {
        if (active) setFetching(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loading, user, params.id, router]);

  if (loading || !user || fetching || !product) {
    return <ScreenLoading />;
  }

  return (
    <LayoutBackground element="main" background="primary" className="flex items-center justify-center p-4">
      <div className="">
        <ProductForm type={product.type} product={product} />
      </div>
    </LayoutBackground>
  );
}
