import type { Metadata } from "next";

import { baseOpenGraph } from "@/lib/metadata";

import ExploreProductsPage, { type ExploreInitialData } from "./components/ExploreProductsPage";
import { EXPLORE_CREATOR_LIMIT, EXPLORE_PAGE_SIZE } from "./components/explore-config";
import { createSupabasePublicClient } from "@vippin/supabase/client/public";
import { SupabaseCreatorRepository } from "@vippin/supabase/infrastructure/supabase/supabase-creator-repository";
import { SupabaseProductRepository } from "@vippin/supabase/infrastructure/supabase/supabase-product-repository";

export const metadata: Metadata = {
  title: "Explorar aulas, materiais e criadores",
  description:
    "Encontre aulas, materiais digitais e produtos de criadores brasileiros. Compre com Pix e acesse na hora.",
  alternates: { canonical: "/explore" },
  openGraph: {
    ...baseOpenGraph(),
    title: "Explorar aulas, materiais e criadores | Vippin",
    description:
      "Encontre aulas, materiais digitais e produtos de criadores brasileiros. Compre com Pix e acesse na hora.",
    url: "/explore",
  },
};

/** Catálogo público: revalida a primeira página a cada 5 minutos. */
export const revalidate = 300;

async function loadInitialData(): Promise<ExploreInitialData | undefined> {
  try {
    // Leitura como visitante deslogado (RLS), sem cookies: dá para cachear.
    const client = createSupabasePublicClient();
    const [creators, products] = await Promise.all([
      new SupabaseCreatorRepository(client).searchExplore({ limit: EXPLORE_CREATOR_LIMIT }),
      new SupabaseProductRepository(client).searchExplore({ page: 1, pageSize: EXPLORE_PAGE_SIZE }),
    ]);
    return { creators, products: products.items, total: products.total };
  } catch {
    // Falhou no servidor: a página busca no navegador, como antes.
    return undefined;
  }
}

export default async function ExplorePage() {
  const initialData = await loadInitialData();
  return <ExploreProductsPage initialData={initialData} />;
}
