"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw } from "lucide-react";

/* ============================================================
   Shared types – match the API responses (admin routes)
   ============================================================ */

export interface AdminStats {
  counts: {
    users: number;
    sessions: number;
    tasks: number;
    plans: number;
    notes: number;
    decks: number;
    tickets: number;
    logs: number;
  };
  payingUsers: number;
  newThisMonth: number;
  totalMinutes: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  planTier: string;
  planStatus: string;
  createdAt: string;
  lastActiveAt: string;
  emailVerified: boolean;
}

export interface AdminUserList {
  users: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminRevenueMonth {
  label: string;
  revenue: number;
  users: number;
}

export interface AdminRevenue {
  months: AdminRevenueMonth[];
  tierCounts: { planTier: string; _count: number }[];
  mrr: number;
}

export interface AdminTicket {
  id: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  createdAt: string;
  userId: string;
  user?: { name: string | null; email: string } | null;
}

export interface AdminFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  rollout: number;
  createdAt: string;
}

export interface AdminLog {
  id: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  meta: string | null;
  createdAt: string;
}

/* ============================================================
   Query hooks
   ============================================================ */

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => api<AdminStats>("/api/admin/stats"),
  });
}

export function useAdminUsers(params: {
  page: number;
  pageSize: number;
  q?: string;
  tier?: string;
  role?: string;
}) {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("pageSize", String(params.pageSize));
  if (params.q) search.set("q", params.q);
  if (params.tier) search.set("tier", params.tier);
  if (params.role) search.set("role", params.role);
  const path = `/api/admin/users?${search.toString()}`;
  return useQuery<AdminUserList>({
    queryKey: ["/api/admin/users", search.toString()],
    queryFn: () => api<AdminUserList>(path),
    placeholderData: (prev) => prev,
  });
}

export function useAdminRevenue() {
  return useQuery<AdminRevenue>({
    queryKey: ["/api/admin/revenue"],
    queryFn: () => api<AdminRevenue>("/api/admin/revenue"),
  });
}

export function useAdminTickets() {
  return useQuery<{ tickets: AdminTicket[] }>({
    queryKey: ["/api/admin/tickets"],
    queryFn: () => api<{ tickets: AdminTicket[] }>("/api/admin/tickets"),
  });
}

export function useAdminFlags() {
  return useQuery<{ flags: AdminFlag[] }>({
    queryKey: ["/api/admin/flags"],
    queryFn: () => api<{ flags: AdminFlag[] }>("/api/admin/flags"),
  });
}

export function useAdminLogs(params: {
  page: number;
  pageSize: number;
  q?: string;
  level?: string;
}) {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("pageSize", String(params.pageSize));
  if (params.q) search.set("q", params.q);
  if (params.level) search.set("level", params.level);
  const path = `/api/admin/logs?${search.toString()}`;
  return useQuery<{
    logs: AdminLog[];
    page: number;
    pageSize: number;
    total: number;
  }>({
    queryKey: ["/api/admin/logs", search.toString()],
    queryFn: () =>
      api<{
        logs: AdminLog[];
        page: number;
        pageSize: number;
        total: number;
      }>(path),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
  });
}

/* ============================================================
   Error / forbidden states
   ============================================================ */

export function isForbidden(err: unknown) {
  return Boolean(err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 403);
}

export function ForbiddenState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">Admin access required</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Your account doesn&apos;t have permission to view this section. If this seems wrong, ask another admin to grant
        you the admin role.
      </p>
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-muted-foreground">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {message || "We couldn't load this section. Try again in a moment."}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-5 gap-2" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  );
}

/* ============================================================
   Hooks / formatters
   ============================================================ */

export function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtMinutes(m: number): string {
  if (!m) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export const PLAN_PRICE: Record<string, number> = {
  free: 0,
  pro: 9,
  scholar: 19,
};

export function planPrice(tier: string): number {
  return PLAN_PRICE[tier] ?? 0;
}

export function initialsOf(name?: string | null): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
