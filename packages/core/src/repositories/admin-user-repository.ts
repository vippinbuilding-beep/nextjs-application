import type { UserRole } from "../models/user";

/**
 * Repositório administrativo de usuários: busca/listagem paginada e detalhe
 * cross-usuário. Separado de `UserRepository` (contrato self-service) porque
 * expõe leituras de todos os usuários — roda só no servidor com service role.
 */

export interface AdminUserListItem {
  id: string;
  email: string | null;
  displayName: string | null;
  creatorName: string | null;
  slug: string | null;
  role: UserRole;
  onboardingCompleted: boolean;
  createdAt: Date;
}

export interface AdminUserSearchParams {
  query?: string;
  role?: UserRole;
  page: number;
  pageSize: number;
}

export interface AdminUserSearchResult {
  items: AdminUserListItem[];
  total: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  name: string | null;
  bio: string | null;
  askMeEnabled: boolean;
  askMePriceCents: number | null;
  // Como criador.
  productsCount: number;
  salesCount: number;
  grossSalesCents: number;
  askMeReceivedCount: number;
  // Como consumidor.
  purchasesCount: number;
  purchasesSpentCents: number;
  askMeAskedCount: number;
}

export interface AdminUserRepository {
  search(params: AdminUserSearchParams): Promise<AdminUserSearchResult>;
  getDetail(userId: string): Promise<AdminUserDetail | null>;
}
