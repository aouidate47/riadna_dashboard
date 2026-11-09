"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "@/lib/api/auth";
import { getCurrentRiad } from "@/lib/api/riad";
import { session } from "@/lib/auth/session";
import type { PlatformApplication } from "@/lib/api/platform";
import type { Riad, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  riad: Riad | null;
  isAuthenticated: boolean;
  isOwner: boolean;
  /** Every riad this user can open (owners can have several). */
  applications: PlatformApplication[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Switch the whole dashboard to another riad. */
  switchRiad: (riadId: string) => Promise<void>;
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
  const [applications, setApplications] = useState<PlatformApplication[]>([]);

  const login = useCallback(async (email: string, password: string) => {
    const { user, riad } = await authApi.login(email, password);
    setState({ user, riad });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ user: null, riad: null });
    setApplications([]);
  }, []);

  const switchRiad = useCallback(async (riadId: string) => {
    const { user, riad } = await authApi.switchRiad(riadId);
    setState({ user, riad });
  }, []);

  const refreshRiad = useCallback(async () => {
    const riad = await getCurrentRiad();
    setState((s) => ({ ...s, riad }));
  }, []);

  const refreshUser = useCallback(() => {
    const s = session.get();
    if (s) setState((current) => ({ ...current, user: s.user }));
  }, []);

  useEffect(() => {
    if (!state.user) return;
    let cancelled = false;
    authApi
      .getApplications()
      .then((list) => {
        if (!cancelled) setApplications(list);
      })
      .catch(() => {
        if (!cancelled) setApplications([]);
      });
    return () => {
      cancelled = true;
    };
  }, [state.user, state.riad?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: !!state.user,
      isOwner: state.user?.role === "OWNER",
      applications,
      login,
      logout,
      switchRiad,
      refreshRiad,
      refreshUser,
    }),
    [state, applications, login, logout, switchRiad, refreshRiad, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>
      <Fragment key={state.riad?.id ?? "guest"}>{children}</Fragment>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
