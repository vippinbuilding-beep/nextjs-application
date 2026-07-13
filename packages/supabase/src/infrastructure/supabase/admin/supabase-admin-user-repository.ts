import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserRole } from "@vippin/core/models/user";
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUserRepository,
  AdminUserSearchParams,
  AdminUserSearchResult,
} from "@vippin/core/repositories/admin-user-repository";

type ProfileListRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  creator_name: string | null;
  slug: string | null;
  role: string | null;
  onboarding_completed: boolean | null;
  created_at: string | null;
};

function toListItem(row: ProfileListRow): AdminUserListItem {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    creatorName: row.creator_name,
    slug: row.slug,
    role: (row.role === "consumer" ? "consumer" : "creator") as UserRole,
    onboardingCompleted: Boolean(row.onboarding_completed),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  };
}

/**
 * Implementação administrativa de leituras de usuários. Construída com um client
 * service role, que bypassa RLS para ver todos os perfis.
 */
export class SupabaseAdminUserRepository implements AdminUserRepository {
  constructor(private readonly client: SupabaseClient) {}

  async search(params: AdminUserSearchParams): Promise<AdminUserSearchResult> {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(100, Math.max(1, params.pageSize));
    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    let query = this.client
      .from("profiles")
      .select(
        "id, email, display_name, creator_name, slug, role, onboarding_completed, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(fromIdx, toIdx);

    if (params.role) {
      query = query.eq("role", params.role);
    }

    const term = params.query?.trim();
    if (term) {
      // Escapa vírgulas/parênteses que quebrariam a sintaxe do filtro `or`.
      const safe = term.replace(/[,()]/g, " ");
      query = query.or(
        `email.ilike.%${safe}%,creator_name.ilike.%${safe}%,display_name.ilike.%${safe}%,name.ilike.%${safe}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      items: (data ?? []).map((row) => toListItem(row as ProfileListRow)),
      total: count ?? 0,
    };
  }

  async getDetail(userId: string): Promise<AdminUserDetail | null> {
    const { data, error } = await this.client
      .rpc("admin_user_detail", { uid: userId })
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as {
      id: string;
      email: string | null;
      display_name: string | null;
      creator_name: string | null;
      slug: string | null;
      role: string | null;
      onboarding_completed: boolean | null;
      created_at: string | null;
      name: string | null;
      bio: string | null;
      ask_me_enabled: boolean | null;
      ask_me_price_cents: number | null;
      products_count: number;
      sales_count: number;
      gross_sales_cents: number;
      ask_me_received_count: number;
      purchases_count: number;
      purchases_spent_cents: number;
      ask_me_asked_count: number;
    };

    return {
      ...toListItem(row),
      name: row.name,
      bio: row.bio,
      askMeEnabled: Boolean(row.ask_me_enabled),
      askMePriceCents: row.ask_me_price_cents,
      productsCount: Number(row.products_count),
      salesCount: Number(row.sales_count),
      grossSalesCents: Number(row.gross_sales_cents),
      askMeReceivedCount: Number(row.ask_me_received_count),
      purchasesCount: Number(row.purchases_count),
      purchasesSpentCents: Number(row.purchases_spent_cents),
      askMeAskedCount: Number(row.ask_me_asked_count),
    };
  }
}
