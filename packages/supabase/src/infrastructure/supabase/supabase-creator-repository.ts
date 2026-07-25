import type {
  CreatorRepository,
  ExploreCreatorsParams,
  PublicCreator,
} from "@vippin/core/repositories/creator-repository";
import { supabase } from "../../client/client";

type ProfileRow = {
  id: string;
  slug: string;
  creator_name: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
  visit_count: number | null;
};

const SELECT = "id, slug, creator_name, avatar_path, avatar_url, visit_count";

/** Escapes user input for safe use inside a PostgREST `ilike` filter. */
function toIlikePattern(query: string): string {
  const escaped = query
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/"/g, '""');
  return `"%${escaped}%"`;
}

function toPublicCreator(row: ProfileRow): PublicCreator {
  return {
    id: row.id,
    slug: row.slug,
    handle: row.creator_name ?? row.slug,
    avatarPath: row.avatar_path ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    visitCount: row.visit_count ?? 0,
  };
}

export class SupabaseCreatorRepository implements CreatorRepository {
  async searchExplore(params: ExploreCreatorsParams = {}): Promise<PublicCreator[]> {
    const limit = Math.min(24, Math.max(1, params.limit ?? 12));
    const query = params.query?.trim() ?? "";

    // Recomendação: criadores mais visitados primeiro (contagem exata por
    // navegador), com desempate alfabético. Vale tanto para a lista padrão
    // quanto para os resultados de busca.
    let builder = supabase
      .from("public_profiles")
      .select(SELECT)
      .not("creator_name", "is", null)
      .order("visit_count", { ascending: false })
      .order("creator_name", { ascending: true })
      .limit(limit);

    if (query) {
      const pattern = toIlikePattern(query);
      builder = builder.or(`creator_name.ilike.${pattern},slug.ilike.${pattern}`);
    }

    const { data, error } = await builder;
    if (error) throw new Error(error.message);
    return ((data ?? []) as ProfileRow[]).map(toPublicCreator);
  }
}
