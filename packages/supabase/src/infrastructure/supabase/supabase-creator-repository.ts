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

    const { data: productRows, error: productsError } = await supabase
      .from("products")
      .select("creator_id")
      .order("created_at", { ascending: false })
      .limit(200);

    if (productsError) throw new Error(productsError.message);

    const creatorIds: string[] = [];
    const seen = new Set<string>();
    for (const row of (productRows ?? []) as ProductCreatorRow[]) {
      if (seen.has(row.creator_id)) continue;
      seen.add(row.creator_id);
      creatorIds.push(row.creator_id);
      if (creatorIds.length >= limit) break;
    }

    if (!creatorIds.length) return [];

    const { data, error } = await supabase
      .from("public_profiles")
      .select("id, slug, creator_name, avatar_path, avatar_url")
      .in("id", creatorIds);

    if (error) throw new Error(error.message);

    const creatorsById = new Map(
      ((data ?? []) as ProfileRow[]).map((row) => [row.id, toPublicCreator(row)])
    );

    return creatorIds
      .map((id) => creatorsById.get(id))
      .filter((creator): creator is PublicCreator => Boolean(creator));
  }
}
