import type { User } from "@/core/models/user";

/**
 * Contract for authentication. Swapping the auth backend later only requires
 * a new implementation of this interface.
 *
 * Note: `signInWithGoogle` performs an OAuth redirect and therefore returns
 * `void` — the browser navigates away before any return value could be used.
 * The post-login routing is handled by `/auth/callback`.
 */
export interface AuthRepository {
  signUp(email: string, password: string): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  /**
   * Starts the Google OAuth flow. `next` is an optional in-app path to return to
   * after login completes (forwarded through the callback).
   */
  signInWithGoogle(next?: string): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
  /**
   * Subscribe to auth state changes. Returns an unsubscribe function.
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
}
