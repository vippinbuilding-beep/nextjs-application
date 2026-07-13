import type { CreatorRepository } from "@vippin/core/repositories/creator-repository";
import type { AskMeQuestionRepository } from "@vippin/core/repositories/ask-me-repository";
import type { AuthRepository } from "@vippin/core/repositories/auth-repository";
import type { NotificationRepository } from "@vippin/core/repositories/notification-repository";
import type { ProfileLinkRepository } from "@vippin/core/repositories/profile-link-repository";
import type { ProductCommentRepository } from "@vippin/core/repositories/product-comment-repository";
import type { ProductAccessRepository } from "@vippin/core/repositories/product-access-repository";
import type { ProductProgressRepository } from "@vippin/core/repositories/product-progress-repository";
import type { ProductRepository } from "@vippin/core/repositories/product-repository";
import type { UserRepository } from "@vippin/core/repositories/user-repository";
import { SupabaseAskMeQuestionRepository } from "../infrastructure/supabase/supabase-ask-me-repository";
import { SupabaseAuthRepository } from "../infrastructure/supabase/supabase-auth-repository";
import { SupabaseCreatorRepository } from "../infrastructure/supabase/supabase-creator-repository";
import { supabase } from "../client/client";
import { SupabaseNotificationRepository } from "../infrastructure/supabase/supabase-notification-repository";
import { SupabaseProfileLinkRepository } from "../infrastructure/supabase/supabase-profile-link-repository";
import { SupabaseProductCommentRepository } from "../infrastructure/supabase/supabase-product-comment-repository";
import { SupabaseProductAccessRepository } from "../infrastructure/supabase/supabase-product-access-repository";
import { SupabaseProductProgressRepository } from "../infrastructure/supabase/supabase-product-progress-repository";
import { SupabaseProductRepository } from "../infrastructure/supabase/supabase-product-repository";
import { SupabaseUserRepository } from "../infrastructure/supabase/supabase-user-repository";

/**
 * Single composition root for picking backend implementations.
 *
 * To migrate to a different backend later:
 *   1. Add a new implementation under `src/infrastructure/<backend>/` that
 *      satisfies the same repository interface.
 *   2. Swap the constructor calls below. Nothing else in the app changes.
 */
export const authRepository: AuthRepository = new SupabaseAuthRepository();
export const creatorRepository: CreatorRepository = new SupabaseCreatorRepository();
export const userRepository: UserRepository = new SupabaseUserRepository();
export const productRepository: ProductRepository = new SupabaseProductRepository();
export const productProgressRepository: ProductProgressRepository =
  new SupabaseProductProgressRepository();
export const productAccessRepository: ProductAccessRepository =
  new SupabaseProductAccessRepository();
export const productCommentRepository: ProductCommentRepository =
  new SupabaseProductCommentRepository();
export const profileLinkRepository: ProfileLinkRepository =
  new SupabaseProfileLinkRepository();
export const askMeQuestionRepository: AskMeQuestionRepository =
  new SupabaseAskMeQuestionRepository(supabase);
export const notificationRepository: NotificationRepository =
  new SupabaseNotificationRepository();
