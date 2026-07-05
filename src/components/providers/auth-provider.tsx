"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { User } from "@/core/models/user";
import type { GoogleSignInOptions } from "@/core/repositories/auth-repository";
import { authRepository, userRepository } from "@/services/repository-factory";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (options?: GoogleSignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authRepository.onAuthStateChanged(async (nextUser) => {
      if (nextUser) {
        const profile = await userRepository.getById(nextUser.id);
        setUser(profile ?? nextUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async (options?: GoogleSignInOptions): Promise<void> => {
    await authRepository.signInWithGoogle(options);
  }, []);

  const signOut = useCallback(async () => {
    await authRepository.signOut();
  }, []);

  const refreshUser = useCallback(async () => {
    const current = authRepository.getCurrentUser();
    if (!current) return;
    const profile = await userRepository.getById(current.id);
    setUser(profile ?? current);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signInWithGoogle, signOut, refreshUser }),
    [user, loading, signInWithGoogle, signOut, refreshUser]
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
