"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/fetch";

export interface DashboardData {
  user: any;
  stats: {
    minutes7d: number;
    tasksDone7d: number;
    weeklyGoalMin: number;
    subjects: number;
    openTasks: number;
    streak: number;
    unread: number;
  };
  subjects: any[];
  tasks: any[];
  sessions7d: any[];
  byDay: Record<string, number>;
  bySubject: Record<string, { minutes: number; color: string }>;
  todayStats: any[];
  notifications: any[];
  activity: any[];
  dueSoon: any[];
  plans: any[];
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: () => api<DashboardData>("/api/dashboard"),
    enabled: typeof window !== "undefined",
    refetchInterval: 60_000,
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useMarkRead() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => inv(["/api/dashboard", "/api/notifications"]),
  });
}

export function useReadAll() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: () => api("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => inv(["/api/dashboard", "/api/notifications"]),
  });
}

export function useStreak() {
  return useQuery<{ streak: number; best: number; studiedToday: boolean }>({
    queryKey: ["/api/streak"],
    queryFn: () => api("/api/streak"),
  });
}

export function useInsights() {
  return useQuery<{ minutes: number; tasksDone: number; topSubject: string; goalMin: number; insight: string }>({
    queryKey: ["/api/insights"],
    queryFn: () => api("/api/insights"),
  });
}

/* simple keyboard hook */
export function useHotkey(combo: string, fn: () => void) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const parts = combo.toLowerCase().split("+");
      const key = parts[parts.length - 1];
      const needMeta = parts.includes("meta") || parts.includes("cmd");
      const needCtrl = parts.includes("ctrl");
      const needShift = parts.includes("shift");
      const meta = e.metaKey || e.ctrlKey;
      if (needMeta && !meta) return;
      if (needCtrl && !e.ctrlKey) return;
      if (needShift && !e.shiftKey) return;
      const k = e.key;
      if (!k) return;
      if (k.toLowerCase() === key) {
        e.preventDefault();
        fnRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [combo]);
}

/**
 * Two-key sequence shortcut (e.g. "g" then "d" → dashboard).
 * Ignores key presses when the user is typing in an input/textarea/select
 * or when a modifier key is held.
 */
export function useSequenceShortcut(first: string, second: string, fn: () => void) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  useEffect(() => {
    let armed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key?.toLowerCase();
      if (!k) return;
      if (!armed) {
        if (k === first) {
          armed = true;
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => { armed = false; }, 1200);
        }
        return;
      }
      if (k === second) {
        e.preventDefault();
        armed = false;
        if (timer) clearTimeout(timer);
        fnRef.current();
      } else {
        armed = false;
        if (timer) clearTimeout(timer);
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (timer) clearTimeout(timer);
    };
  }, [first, second]);
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
