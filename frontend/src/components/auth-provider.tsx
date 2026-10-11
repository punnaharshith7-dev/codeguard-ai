"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, signOut as nextAuthSignOut, useSession } from "next-auth/react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider><AuthStateProvider>{children}</AuthStateProvider></SessionProvider>;
}

function AuthStateProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const current = await api.me();
      setUser(current);
      return current;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session.status === "unauthenticated") {
      setUser(null);
      setLoading(false);
    } else if (session.status === "authenticated") {
      void refresh();
    }
  }, [session.status, refresh]);

  const signOut = useCallback(async () => {
    try { await nextAuthSignOut({ redirect: false }); } finally {
      setUser(null);
      router.push("/");
      router.refresh();
    }
  }, [router]);

  const value = useMemo(() => ({ user, loading, refresh, signOut, setUser }), [user, loading, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be rendered inside AuthProvider");
  return value;
}

