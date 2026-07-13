import "server-only";

import type { AskMeQuestionRepository } from "@vippin/core/repositories/ask-me-repository";
import type { OrderRepository } from "@vippin/core/repositories/order-repository";
import type { AdminAnalyticsRepository } from "@vippin/core/repositories/admin-analytics-repository";
import type { AdminUserRepository } from "@vippin/core/repositories/admin-user-repository";

import { createSupabaseAdminClient } from "../client/admin";
import { SupabaseAskMeQuestionRepository } from "../infrastructure/supabase/supabase-ask-me-repository";
import { SupabaseOrderRepository } from "../infrastructure/supabase/supabase-order-repository";
import { SupabaseAdminAnalyticsRepository } from "../infrastructure/supabase/admin/supabase-admin-analytics-repository";
import { SupabaseAdminUserRepository } from "../infrastructure/supabase/admin/supabase-admin-user-repository";

/**
 * Composição dos repositórios ADMINISTRATIVOS, todos ligados ao client service
 * role (bypassa RLS). Isolado do `repository-factory.ts` (client-safe) de
 * propósito: o `import "server-only"` no topo faz o BUILD FALHAR se este módulo
 * for importado de um Client Component, garantindo que a service role nunca
 * vaze para o browser. Consuma daqui apenas em Server Components / Route
 * Handlers do apps/dashboard.
 */
const adminClient = createSupabaseAdminClient();

export const adminAnalyticsRepository: AdminAnalyticsRepository =
  new SupabaseAdminAnalyticsRepository(adminClient);

export const adminUserRepository: AdminUserRepository =
  new SupabaseAdminUserRepository(adminClient);

// Repositórios já existentes, reaproveitados com o client service role.
export const adminOrderRepository: OrderRepository = new SupabaseOrderRepository(
  adminClient
);

export const adminAskMeQuestionRepository: AskMeQuestionRepository =
  new SupabaseAskMeQuestionRepository(adminClient);
