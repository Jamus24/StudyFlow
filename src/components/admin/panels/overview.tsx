"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { PanelHeader, StatCard, LoadingBlock } from "@/components/app/panel-utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayersIcon } from "@/components/shared/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users as UsersIcon,
  CreditCard,
  LifeBuoy,
  TrendingUp,
  Activity,
  BookOpen,
  StickyNote,
  FolderKanban,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  useAdminStats,
  useAdminRevenue,
  useAdminTickets,
  type AdminUser,
  type AdminTicket,
  ForbiddenState,
  ErrorState,
  isForbidden,
  fmtMoney,
  timeAgo,
  fmtMinutes,
  initialsOf,
} from "../lib";

const PIE_COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function AdminOverview() {
  const stats = useAdminStats();
  const rev = useAdminRevenue();
  const tickets = useAdminTickets();
  const usersQ = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users", "page=1&pageSize=5"],
    queryFn: () => api<{ users: AdminUser[] }>("/api/admin/users?page=1&pageSize=5"),
  });

  const isLoading =
    stats.isLoading || rev.isLoading || tickets.isLoading || usersQ.isLoading;
  const err = stats.error || rev.error || tickets.error || usersQ.error;

  if (err && isForbidden(err)) {
    return (
      <div>
        <PanelHeader title="Overview" description="Platform health at a glance" icon={LayoutDashboard} />
        <ForbiddenState />
      </div>
    );
  }

  if (err) {
    return (
      <div>
        <PanelHeader title="Overview" description="Platform health at a glance" icon={LayoutDashboard} />
        <ErrorState
          message={err.message || "Couldn't load admin metrics."}
          onRetry={() => {
            stats.refetch();
            rev.refetch();
            tickets.refetch();
            usersQ.refetch();
          }}
        />
      </div>
    );
  }

  if (isLoading || !stats.data || !rev.data || !tickets.data || !usersQ.data) {
    return (
      <div>
        <PanelHeader title="Overview" description="Platform health at a glance" icon={LayoutDashboard} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <LoadingBlock key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <LoadingBlock className="h-72 lg:col-span-2" />
          <LoadingBlock className="h-72" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <LoadingBlock className="h-64" />
          <LoadingBlock className="h-64" />
        </div>
      </div>
    );
  }

  const s = stats.data;
  const r = rev.data;
  const allTickets: AdminTicket[] = tickets.data.tickets;

  const pieData = r.tierCounts.map((c) => ({ name: c.planTier, value: c._count }));
  const monthData = r.months.map((m) => ({ label: m.label, revenue: m.revenue, users: m.users }));
  const openTickets = allTickets
    .filter((x) => x.status === "open" || x.status === "pending")
    .slice(0, 3);
  const recentUsers = usersQ.data.users.slice(0, 5);

  const metrics: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "Study minutes", value: fmtMinutes(s.totalMinutes), icon: Clock },
    { label: "Tasks created", value: s.counts.tasks.toLocaleString(), icon: Activity },
    { label: "Study plans", value: s.counts.plans.toLocaleString(), icon: BookOpen },
    { label: "Flashcard decks", value: s.counts.decks.toLocaleString(), icon: LayersIcon },
    { label: "Notes written", value: s.counts.notes.toLocaleString(), icon: StickyNote },
    { label: "Study sessions", value: s.counts.sessions.toLocaleString(), icon: FolderKanban },
  ];

  return (
    <div>
      <PanelHeader title="Overview" description="Platform health at a glance" icon={LayoutDashboard} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={s.counts.users.toLocaleString()}
          sub={`${s.newThisMonth} new this month`}
          icon={UsersIcon}
          trend={{ dir: "up", value: `+${s.newThisMonth}` }}
          accent="#2563eb"
        />
        <StatCard
          label="Paying users"
          value={s.payingUsers.toLocaleString()}
          sub={`${Math.round((s.payingUsers / Math.max(1, s.counts.users)) * 100)}% of total`}
          icon={CreditCard}
          accent="#f59e0b"
        />
        <StatCard
          label="MRR"
          value={fmtMoney(r.mrr)}
          sub="per month"
          icon={TrendingUp}
          trend={{ dir: "up", value: "live" }}
          accent="#2563eb"
        />
        <StatCard
          label="Open tickets"
          value={s.counts.tickets}
          sub="awaiting response"
          icon={LifeBuoy}
          accent="#ef4444"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Growth · last 6 months</h3>
              <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
            </div>
            <Badge variant="secondary" className="rounded-md">{fmtMoney(r.mrr)}/mo</Badge>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [fmtMoney(v), "Revenue"]}
                  cursor={{ stroke: "var(--brand)", strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--brand)" strokeWidth={2.5} fill="url(#rev-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">New users by month</p>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${v}`, "New users"]}
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                  />
                  <Bar dataKey="users" radius={[4, 4, 0, 0]} fill="var(--gold)" maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Plan distribution</h3>
            <p className="text-xs text-muted-foreground">{s.counts.users.toLocaleString()} total users</p>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, n: string) => [`${v} users`, n]}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {pieData.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="flex-1 truncate capitalize text-foreground/80">{p.name}</span>
                <span className="text-muted-foreground">{p.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Top metrics</p>
            <ul className="space-y-2">
              {metrics.map((m) => (
                <li key={m.label} className="flex items-center gap-2.5 text-xs">
                  <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 text-foreground/80">{m.label}</span>
                  <span className="font-medium text-foreground">{m.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Recent signups</h3>
            <Badge variant="secondary" className="rounded-md">last 5</Badge>
          </div>
          {recentUsers.length ? (
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-accent text-xs font-semibold">{initialsOf(u.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{u.planTier}</Badge>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(u.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">No users yet.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Open tickets</h3>
            <Badge variant="secondary" className="rounded-md">{openTickets.length} of {allTickets.length}</Badge>
          </div>
          {openTickets.length ? (
            <div className="space-y-2">
              {openTickets.map((tk) => (
                <div key={tk.id} className="rounded-lg border border-border bg-card px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${priorityDot(tk.priority)}`} />
                    <p className="flex-1 truncate text-sm font-medium">{tk.subject}</p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {tk.user?.name || "Unknown user"} · {timeAgo(tk.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">No open tickets. Nicely done.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function priorityDot(p: string): string {
  if (p === "urgent") return "bg-red-500";
  if (p === "high") return "bg-amber-500";
  return "bg-muted-foreground/50";
}
