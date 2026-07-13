"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { User } from "@vippin/core/models/user";
import { authRepository } from "@vippin/supabase/factories/repository-factory";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (options?: { next?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth context do dashboard. Diferente do apps/web, não busca perfil de
 * creator/consumer — o admin não tem esse conceito. A autorização real (a
 * checagem contra a allowlist `admin_users`) acontece no servidor, no
 * middleware e no callback OAuth, via service role. Aqui só mantemos o estado
 * de sessão para renderizar login/logout.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authRepository.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(
    async (options?: { next?: string }): Promise<void> => {
      await authRepository.signInWithGoogle(options);
    },
    []
  );

  const signOut = useCallback(async () => {
    await authRepository.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signInWithGoogle, signOut }),
    [user, loading, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
