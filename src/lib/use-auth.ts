"use client";

import { useEffect, useRef } from "react";
import { useAuthStore, type ClientUser } from "@/lib/store";
import { api } from "@/lib/fetch";

// Module-level flag: only the first useAuth() call triggers the /me fetch.
let authFetched = false;

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const logout = useAuthStore((s) => s.logout);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent multiple /me requests from different component mounts
    if (authFetched || hasFetched.current) return;
    hasFetched.current = true;
    authFetched = true;

    let active = true;
    useAuthStore.getState().setLoading(true);
    api<{ user: (ClientUser & { createdAt?: string }) | null }>("/api/auth/me")
      .then((r) => active && useAuthStore.getState().setUser(r.user as ClientUser | null))
      .catch(() => active && useAuthStore.getState().setUser(null))
      .finally(() => active && useAuthStore.getState().setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { user, loading, logout };
}
