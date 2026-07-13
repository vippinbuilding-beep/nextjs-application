import type { SupabaseClient } from "@supabase/supabase-js";

import type { AskMeQuestion } from "@vippin/core/models/ask-me-question";
import type {
  AdminAskMeListItem,
  AdminAskMeRepository,
  AdminAskMeSearchParams,
  AdminAskMeSearchResult,
} from "@vippin/core/repositories/admin-ask-me-repository";

import { toQuestion, type AskMeRow } from "../supabase-ask-me-repository";

const TABLE = "ask_me_questions";

type ProfileNameRow = {
  id: string;
  creator_name: string | null;
  consumer_name: string | null;
  name: string | null;
};

/**
 * Implementação administrativa de leituras de Ask Me. Construída com um
 * client service role (bypassa RLS para ver perguntas de todos os criadores).
 */
export class SupabaseAdminAskMeRepository implements AdminAskMeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async search(params: AdminAskMeSearchParams): Promise<AdminAskMeSearchResult> {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(100, Math.max(1, params.pageSize));
    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    let query = this.client
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(fromIdx, toIdx);

    if (params.status) {
      query = query.eq("status", params.status);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    const questions = ((data as AskMeRow[]) ?? []).map(toQuestion);
    const items = await this.enrichWithNames(questions);

    return { items, total: count ?? 0 };
  }

  async enrichWithNames(questions: AskMeQuestion[]): Promise<AdminAskMeListItem[]> {
    if (questions.length === 0) return [];

    const ids = [
      ...new Set(questions.flatMap((q) => [q.creatorId, q.askerId])),
    ];

    const { data, error } = await this.client
      .from("public_profile_previews")
      .select("id, creator_name, consumer_name, name")
      .in("id", ids);
    if (error) throw new Error(error.message);

    const names = new Map(
      ((data as ProfileNameRow[]) ?? []).map((row) => [row.id, row])
    );

    const nameFor = (id: string, kind: "creator" | "asker"): string | null => {
      const row = names.get(id);
      if (!row) return null;
      if (kind === "creator") return row.creator_name ?? row.name;
      return row.consumer_name ?? row.name;
    };

    return questions.map((q) => ({
      ...q,
      creatorName: nameFor(q.creatorId, "creator"),
      askerName: nameFor(q.askerId, "asker"),
    }));
  }
}
