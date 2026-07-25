"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, auth, type User } from "@/lib/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const { user: current } = await auth.me();
      setUser(current);
      setStatus("authenticated");
    } catch (error) {
      if (error instanceof ApiError && error.status !== 401) {
        console.error("Failed to load the current session.", error);
      }
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  // setUser alone (e.g. after an onboarding/profile update) doesn't imply a
  // status change - the user is already authenticated. Right after
  // login/verify-otp/reset-password, DashboardShell's guard checks status,
  // not just user, so callers completing a fresh auth flow must use this
  // instead of setUser to avoid being bounced back to /sign-in.
  const setSession = useCallback((current: User) => {
    setUser(current);
    setStatus("authenticated");
  }, []);

  const value = useMemo(
    () => ({ user, status, refresh, setUser, setSession, logout }),
    [user, status, refresh, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
