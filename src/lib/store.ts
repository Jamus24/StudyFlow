"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/fetch";

export type View =
  | "home"
  | "features"
  | "pricing"
  | "contact"
  | "privacy"
  | "terms"
  | "cookies"
  | "login"
  | "register"
  | "forgot"
  | "app"
  | "admin";

export type AppRoute =
  | "dashboard"
  | "focus"
  | "tasks"
  | "subjects"
  | "plans"
  | "tutor"
  | "flashcards"
  | "notes"
  | "calendar"
  | "analytics"
  | "achievements"
  | "weekly-review"
  | "leaderboard"
  | "groups"
  | "exam-prep"
  | "quiz"
  | "settings"
  | "billing"
  | "notifications"
  | "activity";

export type AdminRoute =
  | "overview"
  | "users"
  | "subscriptions"
  | "analytics"
  | "tickets"
  | "flags"
  | "logs";

interface ToastMsg {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
}

interface UIState {
  // navigation
  view: View;
  appRoute: AppRoute;
  adminRoute: AdminRoute;
  // auth modal
  authOpen: boolean;
  authMode: "login" | "register" | "forgot";
  // ui
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  cookieConsent: "granted" | "denied" | null;
  toasts: ToastMsg[];

  setView: (v: View) => void;
  setAppRoute: (r: AppRoute) => void;
  setAdminRoute: (r: AdminRoute) => void;
  openAuth: (mode?: "login" | "register" | "forgot") => void;
  closeAuth: () => void;
  setAuthMode: (m: "login" | "register" | "forgot") => void;
  toggleSidebar: () => void;
  setSidebar: (collapsed: boolean) => void;
  setMobileNav: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setCookieConsent: (v: "granted" | "denied") => void;
  pushToast: (t: Omit<ToastMsg, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      view: "home",
      appRoute: "dashboard",
      adminRoute: "overview",
      authOpen: false,
      authMode: "login",
      sidebarCollapsed: false,
      mobileNavOpen: false,
      commandOpen: false,
      cookieConsent: null,
      toasts: [],

      setView: (v) => set({ view: v, mobileNavOpen: false }),
      setAppRoute: (r) => set({ appRoute: r }),
      setAdminRoute: (r) => set({ adminRoute: r }),
      openAuth: (mode = "login") => set({ authOpen: true, authMode: mode }),
      closeAuth: () => set({ authOpen: false }),
      setAuthMode: (m) => set({ authMode: m }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileNav: (open) => set({ mobileNavOpen: open }),
      setCommandOpen: (open) => set({ commandOpen: open }),
      setCookieConsent: (v) => set({ cookieConsent: v }),
      pushToast: (t) => {
        const id = Math.random().toString(36).slice(2);
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
        setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "lumina-ui",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        cookieConsent: s.cookieConsent,
      }),
    }
  )
);

/* ---- Current user client cache ---- */
export interface ClientUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  bio?: string | null;
  grade?: string | null;
  timezone: string;
  planTier: string;
  planStatus: string;
  onboarded: boolean;
  weeklyGoalMin: number;
  trialEndsAt?: string | null;
  createdAt: string;
}

interface AuthState {
  user: ClientUser | null;
  loading: boolean;
  setUser: (u: ClientUser | null) => void;
  setLoading: (b: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  setUser: (u) => set({ user: u, loading: false }),
  setLoading: (b) => set({ loading: b }),
  logout: async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    set({ user: null });
    useUI.getState().setView("home");
  },
}));
