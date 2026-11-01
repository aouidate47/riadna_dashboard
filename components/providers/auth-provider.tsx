"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import * as authApi from "@/lib/api/auth";
import { getCurrentRiad } from "@/lib/api/riad";
import { session } from "@/lib/auth/session";
import type { Riad, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  riad: Riad | null;
  isAuthenticated: boolean;
  isOwner: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-read the riad (e.g. after editing it in /settings) so the topbar updates. */
  refreshRiad: () => Promise<void>;
  /** Re-read the user from the session (e.g. after editing the name in /profile). */
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User | null; riad: Riad | null }>(() => {
    const s = session.get();
    return { user: s?.user ?? null, riad: s?.riad ?? null };
  });

  const login = useCallback(async (email: string, password: string) => {
    const { user, riad } = await authApi.login(email, password);
    setState({ user, riad });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ user: null, riad: null });
  }, []);

  const refreshRiad = useCallback(async () => {
    const riad = await getCurrentRiad();
    setState((s) => ({ ...s, riad }));
  }, []);

  const refreshUser = useCallback(() => {
    const s = session.get();
    if (s) setState((current) => ({ ...current, user: s.user }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: !!state.user,
      isOwner: state.user?.role === "OWNER",
      login,
      logout,
      refreshRiad,
      refreshUser,
    }),
    [state, login, logout, refreshRiad, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
