import "server-only";

import type { AskMeQuestionRepository } from "@vippin/core/repositories/ask-me-repository";
import type { OrderRepository } from "@vippin/core/repositories/order-repository";
import type { AdminAnalyticsRepository } from "@vippin/core/repositories/admin-analytics-repository";
import type { AdminAskMeRepository } from "@vippin/core/repositories/admin-ask-me-repository";
import type { AdminUserRepository } from "@vippin/core/repositories/admin-user-repository";

import { createSupabaseAdminClient } from "../client/admin";
import { SupabaseAskMeQuestionRepository } from "../infrastructure/supabase/supabase-ask-me-repository";
import { SupabaseOrderRepository } from "../infrastructure/supabase/supabase-order-repository";
import { SupabaseAdminAnalyticsRepository } from "../infrastructure/supabase/admin/supabase-admin-analytics-repository";
import { SupabaseAdminAskMeRepository } from "../infrastructure/supabase/admin/supabase-admin-ask-me-repository";
import { SupabaseAdminUserRepository } from "../infrastructure/supabase/admin/supabase-admin-user-repository";

/**
 * Composição dos repositórios ADMINISTRATIVOS, todos ligados ao client service
 * role (bypassa RLS). Isolado do `repository-factory.ts` (client-safe) de
 * propósito: o `import "server-only"` no topo faz o BUILD FALHAR se este módulo
 * for importado de um Client Component, garantindo que a service role nunca
 * vaze para o browser. Consuma daqui apenas em Server Components / Route
 * Handlers do apps/dashboard.
 *
 * IMPORTANTE — instanciação PREGUIÇOSA: os repositórios são criados só no
 * primeiro uso (via Proxy), nunca no carregamento do módulo. Isso evita que o
 * `SUPABASE_SERVICE_ROLE_KEY` seja exigido em TEMPO DE BUILD (o Next importa
 * este módulo ao "coletar page data", mesmo com páginas `force-dynamic`). Com a
 * criação adiada, a chave só é necessária em runtime, ao atender um request.
 */
function lazyRepository<T extends object>(factory: () => T): T {
  let instance: T | null = null;
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      instance ??= factory();
      const value = Reflect.get(instance as object, prop, receiver);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const adminAnalyticsRepository: AdminAnalyticsRepository = lazyRepository(
  () => new SupabaseAdminAnalyticsRepository(createSupabaseAdminClient())
);

export const adminUserRepository: AdminUserRepository = lazyRepository(
  () => new SupabaseAdminUserRepository(createSupabaseAdminClient())
);

// Repositórios já existentes, reaproveitados com o client service role.
export const adminOrderRepository: OrderRepository = lazyRepository(
  () => new SupabaseOrderRepository(createSupabaseAdminClient())
);

export const adminAskMeQuestionRepository: AskMeQuestionRepository = lazyRepository(
  () => new SupabaseAskMeQuestionRepository(createSupabaseAdminClient())
);

export const adminAskMeRepository: AdminAskMeRepository = lazyRepository(
  () => new SupabaseAdminAskMeRepository(createSupabaseAdminClient())
);
