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
};

type ProductCreatorRow = {
  creator_id: string;
};

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
  };
}

export class SupabaseCreatorRepository implements CreatorRepository {
  async searchExplore(params: ExploreCreatorsParams = {}): Promise<PublicCreator[]> {
    const limit = Math.min(24, Math.max(1, params.limit ?? 12));
    const query = params.query?.trim() ?? "";

    if (query) {
      const pattern = toIlikePattern(query);
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, slug, creator_name, avatar_path, avatar_url")
        .not("creator_name", "is", null)
        .or(`creator_name.ilike.${pattern},slug.ilike.${pattern}`)
        .order("creator_name", { ascending: true })
        .limit(limit);

      if (error) throw new Error(error.message);
      return ((data ?? []) as ProfileRow[]).map(toPublicCreator);
    }

    // Sem busca: mostramos todos os criadores da plataforma, mas priorizando
    // quem publicou produto recentemente. Criadores sem nenhum produto aparecem
    // logo depois, em ordem alfabética, até completar o limite.
    const [priorityIds, profileRows] = await Promise.all([
      this.recentProductCreatorIds(limit),
      this.listPublicCreators(limit + 200),
    ]);

    const profilesById = new Map(
      profileRows.map((row) => [row.id, row])
    );

    const ordered: PublicCreator[] = [];
    const seen = new Set<string>();

    // 1) Criadores com produto recente, na ordem de publicação.
    for (const id of priorityIds) {
      const row = profilesById.get(id);
      if (!row || seen.has(id)) continue;
      seen.add(id);
      ordered.push(toPublicCreator(row));
      if (ordered.length >= limit) return ordered;
    }

    // 2) Demais criadores (inclusive sem produto), em ordem alfabética.
    for (const row of profileRows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      ordered.push(toPublicCreator(row));
      if (ordered.length >= limit) break;
    }

    return ordered;
  }

  /** Ids de criadores por produto publicado mais recente (mais novo primeiro). */
  private async recentProductCreatorIds(limit: number): Promise<string[]> {
    const { data, error } = await supabase
      .from("products")
      .select("creator_id")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    const ids: string[] = [];
    const seen = new Set<string>();
    for (const row of (data ?? []) as ProductCreatorRow[]) {
      if (seen.has(row.creator_id)) continue;
      seen.add(row.creator_id);
      ids.push(row.creator_id);
      if (ids.length >= limit) break;
    }
    return ids;
  }

  /** Perfis públicos com nome definido, em ordem alfabética. */
  private async listPublicCreators(limit: number): Promise<ProfileRow[]> {
    const { data, error } = await supabase
      .from("public_profiles")
      .select("id, slug, creator_name, avatar_path, avatar_url")
      .not("creator_name", "is", null)
      .order("creator_name", { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as ProfileRow[];
  }
}
