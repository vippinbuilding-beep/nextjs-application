"use client";

import { ChevronLeft, ChevronRight, Home, Library, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProductFeed } from "@/components/products/product-feed";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutBackground } from "@/components/ui/layout-background";
import { Loading } from "@/components/ui/loading";
import { ScreenLoading } from "@/components/ui/screen-loading";
import type { ProductWithCreator } from "@/core/repositories/product-repository";
import { isConsumer } from "@/lib/user-role";
import { productRepository } from "@/services/repository-factory";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 350;

export default function ExploreProductsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [products, setProducts] = useState<ProductWithCreator[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/explore");
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
      return;
    }
    if (!isConsumer(user)) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const result = await productRepository.searchExplore({
        query: searchQuery || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setProducts(result.items);
      setTotal(result.total);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setProductsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    if (!user?.id || !isConsumer(user) || !user.onboardingCompleted) return;
    void loadProducts();
  }, [user, loadProducts]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;
  const resultsLabel =
    total === 0
      ? searchQuery
        ? "Nenhum resultado"
        : "Nenhum produto"
      : total === 1
        ? "1 produto"
        : `${total} produtos`;

  return (
    <LayoutBackground
      element="main"
      className="flex h-svh min-h-svh flex-col overflow-hidden"
    >
      <header className="shrink-0 border-b-2 border-border bg-background/95 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Explorar produtos</h1>
              <p className="text-muted-foreground text-sm font-medium">
                Descubra aulas e materiais dos criadores da plataforma.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <NotificationBell />
              <Button size="sm" variant="outline" asChild>
                <Link href="/">
                  <Home className="size-4" />
                  Início
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/my-products">
                  <Library className="size-4" />
                  Meus produtos
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por título, descrição ou criador..."
              className="pl-10"
              aria-label="Buscar produtos"
            />
          </div>

          <p className="text-muted-foreground text-xs font-medium">
            {productsLoading ? "Buscando..." : resultsLabel}
            {!productsLoading && total > 0 && totalPages > 1
              ? ` · Página ${page} de ${totalPages}`
              : ""}
          </p>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto w-full max-w-6xl">
          {productsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loading />
            </div>
          ) : (
            <ProductFeed
              products={products}
              emphasizePrice
              wideGrid
              emptyLabel={
                searchQuery
                  ? "Nenhum produto encontrado para essa busca."
                  : "Ainda não há produtos publicados para explorar."
              }
            />
          )}
        </div>
      </section>

      {totalPages > 1 && (
        <footer className="shrink-0 border-t-2 border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canGoBack || productsLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <span className="text-muted-foreground text-xs font-medium">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canGoForward || productsLoading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Próxima
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </footer>
      )}
    </LayoutBackground>
  );
}
