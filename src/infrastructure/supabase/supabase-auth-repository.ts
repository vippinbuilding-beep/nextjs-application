import type { User as SupabaseUser } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { User } from "@/core/models/user";
import type { AuthRepository } from "@/core/repositories/auth-repository";

/**
 * Supabase Auth implementation of {@link AuthRepository}.
 */
export class SupabaseAuthRepository implements AuthRepository {
  private _currentUser: User | null = null;

  async signUp(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Sign up failed");
    return toUser(data.user);
  }

  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Sign in failed");
    return toUser(data.user);
  }

  async signInWithGoogle(options?: { next?: string; role?: "creator" | "consumer" }): Promise<void> {
    const callback = new URL("/auth/callback", window.location.origin);
    if (options?.next) callback.searchParams.set("next", options.next);
    if (options?.role) callback.searchParams.set("role", options.role);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
      },
    });
    if (error) throw new Error(error.message);
    // Browser navigates away — nothing to return.
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  getCurrentUser(): User | null {
    return this._currentUser;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ? toUser(session.user) : null;
      this._currentUser = user;
      callback(user);
    });
    return () => subscription.unsubscribe();
  }
}

function toUser(sbUser: SupabaseUser): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? "",
    displayName:
      (sbUser.user_metadata?.full_name as string | undefined) ??
      (sbUser.user_metadata?.name as string | undefined) ??
      null,
    createdAt: sbUser.created_at ? new Date(sbUser.created_at) : new Date(),
  };
}
