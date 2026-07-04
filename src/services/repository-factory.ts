import type { AuthRepository } from "@/core/repositories/auth-repository";
import type { ProductAccessRepository } from "@/core/repositories/product-access-repository";
import type { ProductProgressRepository } from "@/core/repositories/product-progress-repository";
import type { ProductRepository } from "@/core/repositories/product-repository";
import type { UserRepository } from "@/core/repositories/user-repository";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/supabase-auth-repository";
import { SupabaseProductAccessRepository } from "@/infrastructure/supabase/supabase-product-access-repository";
import { SupabaseProductProgressRepository } from "@/infrastructure/supabase/supabase-product-progress-repository";
import { SupabaseProductRepository } from "@/infrastructure/supabase/supabase-product-repository";
import { SupabaseUserRepository } from "@/infrastructure/supabase/supabase-user-repository";

/**
 * Single composition root for picking backend implementations.
 *
 * To migrate to a different backend later:
 *   1. Add a new implementation under `src/infrastructure/<backend>/` that
 *      satisfies the same repository interface.
 *   2. Swap the constructor calls below. Nothing else in the app changes.
 */
export const authRepository: AuthRepository = new SupabaseAuthRepository();
export const userRepository: UserRepository = new SupabaseUserRepository();
export const productRepository: ProductRepository = new SupabaseProductRepository();
export const productProgressRepository: ProductProgressRepository =
  new SupabaseProductProgressRepository();
export const productAccessRepository: ProductAccessRepository =
  new SupabaseProductAccessRepository();
