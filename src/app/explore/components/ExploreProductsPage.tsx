"use client";

import { ChevronLeft, ChevronRight, Compass, Home, Library, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CreatorFeed } from "@/components/explore/creator-feed";
import { ProductFeed } from "@/components/products/product-feed";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutBackground } from "@/components/ui/layout-background";
import { Loading } from "@/components/ui/loading";
import { ScreenLoading } from "@/components/ui/screen-loading";
import type { PublicCreator } from "@/core/repositories/creator-repository";
import type { ProductWithCreator } from "@/core/repositories/product-repository";
import { isConsumer, isCreator } from "@/lib/user-role";
import { creatorRepository, productRepository } from "@/services/repository-factory";

const PAGE_SIZE = 12;
const CREATOR_LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 350;

function ExploreFeedLoading({ searching }: { searching: boolean }) {
  const Icon = searching ? Search : Library;

  return (
    <div
      className="flex min-h-[min(60vh,28rem)] flex-col items-center justify-center gap-5 py-16 text-center"
      aria-busy="true"
    >
      <div className="relative flex size-16 items-center justify-center rounded-2xl border-2 border-border bg-background shadow-cartoon">
        <span className="absolute inset-0 animate-ping rounded-2xl border-2 border-border opacity-20" />
        <Icon className="text-muted-foreground size-7" strokeWidth={2.25} />
        <Loading className="absolute -right-2 -bottom-2 size-6 rounded-full border-2 border-border bg-primary p-0.5" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-lg font-bold tracking-tight">
          {searching ? "Buscando..." : "Carregando catálogo..."}
        </p>
        <p className="text-muted-foreground max-w-xs text-sm font-medium">
          {searching
            ? "Filtrando criadores, aulas e materiais para você."
            : "Montando criadores e produtos publicados na plataforma."}
        </p>
      </div>

      <span className="sr-only" role="status">
        {searching ? "Buscando criadores e produtos" : "Carregando catálogo"}
      </span>
    </div>
  );
}

export default function ExploreProductsPage() {
  const { user, loading } = useAuth();

  const [creators, setCreators] = useState<PublicCreator[]>([]);
  const [products, setProducts] = useState<ProductWithCreator[]>([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadExplore = useCallback(async () => {
    setExploreLoading(true);
    try {
      const [creatorsResult, productsResult] = await Promise.all([
        creatorRepository.searchExplore({
          query: searchQuery || undefined,
          limit: CREATOR_LIMIT,
        }),
        productRepository.searchExplore({
          query: searchQuery || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
      ]);
      setCreators(creatorsResult);
      setProducts(productsResult.items);
      setTotal(productsResult.total);
    } catch {
      setCreators([]);
      setProducts([]);
      setTotal(0);
    } finally {
      setExploreLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadExplore();
  }, [user, loadExplore]);

  if (loading) {
    return <ScreenLoading />;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;
  const creatorsLabel =
    creators.length === 0
      ? searchQuery
        ? "Nenhum criador"
        : null
      : creators.length === 1
        ? "1 criador"
        : `${creators.length} criadores`;
  const productsLabel =
    total === 0
      ? searchQuery
        ? "Nenhum produto"
        : "Nenhum produto"
      : total === 1
        ? "1 produto"
        : `${total} produtos`;
  const resultsLabel = [creatorsLabel, productsLabel]
    .filter((label): label is string => Boolean(label))
    .join(" · ");

  return (
    <LayoutBackground
      element="main"
      dotsOpacity={0.1}
      className="flex h-svh min-h-svh flex-col overflow-hidden"
    >
      <header className="shrink-0 border-b-2 border-border bg-background/95 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Explorar</h1>
              <p className="text-muted-foreground text-sm font-medium">
                Busque produtos e criadores. Encontre aulas, materiais e vitrines
                na plataforma.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/">
                  <Home className="size-4" />
                  {user ? (isCreator(user) ? "Painel" : "Início") : "Início"}
                </Link>
              </Button>
              {user && isConsumer(user) && (
                <Button size="sm" asChild>
                  <Link href="/my-products">
                    <Library className="size-4" />
                    Meus produtos
                  </Link>
                </Button>
              )}
              {!user && (
                <Button size="sm" asChild>
                  <Link href="/login?next=/explore">
                    <Compass className="size-4" />
                    Entrar
                  </Link>
                </Button>
              )}
              {user && <NotificationBell />}
            </div>
          </div>

          <div className="relative transition-all focus-within:-translate-y-0.5">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar produtos ou criadores..."
              className="pl-10 focus-visible:translate-y-0"
              aria-label="Buscar produtos e criadores"
            />
          </div>

          <p className="text-muted-foreground text-xs font-medium">
            {exploreLoading ? "Buscando..." : resultsLabel}
            {!exploreLoading && total > 0 && totalPages > 1
              ? ` · Página ${page} de ${totalPages}`
              : ""}
          </p>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          {exploreLoading ? (
            <ExploreFeedLoading searching={Boolean(searchQuery)} />
          ) : (
            <>
              <CreatorFeed
                creators={creators}
                searching={Boolean(searchQuery)}
                emptyLabel="Nenhum criador encontrado para essa busca."
              />

              <section className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-sm font-bold uppercase tracking-wide">Produtos</h2>
                  <p className="text-muted-foreground text-xs font-medium">
                    {searchQuery
                      ? "Aulas e materiais que batem com a sua busca."
                      : "Últimos produtos publicados na plataforma."}
                  </p>
                </div>

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
              </section>
            </>
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
              disabled={!canGoBack || exploreLoading}
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
              disabled={!canGoForward || exploreLoading}
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
