import type { AskMeQuestion, AskMeQuestionStatus } from "../models/ask-me-question";

/**
 * Leituras administrativas de Ask Me: listagem cross-usuário com nomes
 * resolvidos (a UI não deve mostrar IDs crus). Roda só no servidor com
 * service role.
 */

export interface AdminAskMeListItem extends AskMeQuestion {
  creatorName: string | null;
  askerName: string | null;
}

export interface AdminAskMeSearchParams {
  status?: AskMeQuestionStatus;
  page: number;
  pageSize: number;
}

export interface AdminAskMeSearchResult {
  items: AdminAskMeListItem[];
  total: number;
}

export interface AdminAskMeRepository {
  search(params: AdminAskMeSearchParams): Promise<AdminAskMeSearchResult>;
  /** Anexa creatorName/askerName a uma lista já carregada (ex.: repasses/reembolsos). */
  enrichWithNames(questions: AskMeQuestion[]): Promise<AdminAskMeListItem[]>;
}
