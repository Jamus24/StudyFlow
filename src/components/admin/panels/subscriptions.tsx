"use client";

import { PanelHeader, StatCard, LoadingBlock } from "@/components/app/panel-utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, TrendingUp, Users as UsersIcon, Activity, RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  useAdminRevenue,
  useAdminStats,
  type AdminRevenue,
  ForbiddenState,
  ErrorState,
  isForbidden,
  fmtMoney,
  planPrice,
} from "../lib";

const PIE_COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface TxnRow {
  id: string;
  date: string;
  user: string;
  plan: "pro" | "scholar";
  amount: number;
  status: "Paid" | "Refunded";
}

const MOCK_TXNS: TxnRow[] = [
  { id: "t1", date: "2025-04-12", user: "Mia Chen", plan: "scholar", amount: 19, status: "Paid" },
  { id: "t2", date: "2025-04-11", user: "Thabo Nkosi", plan: "pro", amount: 9, status: "Paid" },
  { id: "t3", date: "2025-04-10", user: "Aisha Patel", plan: "pro", amount: 9, status: "Paid" },
  { id: "t4", date: "2025-04-09", user: "Liam van der Merwe", plan: "scholar", amount: 19, status: "Paid" },
  { id: "t5", date: "2025-04-08", user: "Zinhle Dlamini", plan: "pro", amount: 9, status: "Refunded" },
];

export function AdminSubscriptions() {
  const rev = useAdminRevenue();
  const stats = useAdminStats();

  const isLoading = rev.isLoading || stats.isLoading;
  const err = rev.error || stats.error;

  if (err && isForbidden(err)) {
    return (
      <div>
        <PanelHeader title="Subscriptions" description="Revenue and plan breakdown" icon={CreditCard} />
        <ForbiddenState />
      </div>
    );
  }

  if (err) {
    return (
      <div>
        <PanelHeader title="Subscriptions" description="Revenue and plan breakdown" icon={CreditCard} />
        <ErrorState
          message={(err as Error).message}
          onRetry={() => {
            rev.refetch();
            stats.refetch();
          }}
        />
      </div>
    );
  }

  if (isLoading || !rev.data || !stats.data) {
    return (
      <div>
        <PanelHeader title="Subscriptions" description="Revenue and plan breakdown" icon={CreditCard} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <LoadingBlock key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <LoadingBlock className="h-72 lg:col-span-2" />
          <LoadingBlock className="h-72" />
        </div>
      </div>
    );
  }

  const r: AdminRevenue = rev.data;
  const mrr = r.mrr;
  const arr = mrr * 12;
  const paying = stats.data.payingUsers;

  const monthData = r.months.map((m) => ({ label: m.label, revenue: m.revenue, users: m.users }));
  const pieData = r.tierCounts.map((c) => ({ name: c.planTier, value: c._count }));
  const planRows = r.tierCounts.map((c) => ({
    tier: c.planTier,
    count: c._count,
    price: planPrice(c.planTier),
    mrr: c._count * planPrice(c.planTier),
  }));

  return (
    <div>
      <PanelHeader title="Subscriptions" description="Revenue and plan breakdown" icon={CreditCard} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR" value={fmtMoney(mrr)} sub="this month" icon={TrendingUp} trend={{ dir: "up", value: "live" }} accent="#2563eb" />
        <StatCard label="ARR (run rate)" value={fmtMoney(arr)} sub="annualised" icon={CreditCard} accent="#f59e0b" />
        <StatCard label="Paying users" value={paying.toLocaleString()} sub={`${Math.round((paying / Math.max(1, stats.data.counts.users)) * 100)}% of total`} icon={UsersIcon} accent="#2563eb" />
        <StatCard label="Churn" value="0%" sub="last 30 days" icon={Activity} trend={{ dir: "down", value: "stable" }} accent="#ef4444" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Revenue · last 6 months</h3>
              <p className="text-xs text-muted-foreground">Subscriptions billed per month</p>
            </div>
            <Badge variant="secondary" className="rounded-md">{fmtMoney(mrr)}/mo</Badge>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [fmtMoney(v), "Revenue"]}
                  cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="var(--brand)" maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Plan distribution</h3>
            <p className="text-xs text-muted-foreground">{stats.data.counts.users.toLocaleString()} total accounts</p>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={74} paddingAngle={3} strokeWidth={0}>
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
                <span className="text-muted-foreground">{p.value} · {fmtMoney(p.value * planPrice(p.name))}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">New users by month</h3>
              <p className="text-xs text-muted-foreground">Signups over the last 6 months</p>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v} users`, "Signups"]}
                />
                <Line type="monotone" dataKey="users" stroke="var(--gold)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--gold)" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Plans</h3>
            <Badge variant="secondary" className="rounded-md">{planRows.length} tiers</Badge>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-3 text-xs">Tier</TableHead>
                  <TableHead className="text-xs">Users</TableHead>
                  <TableHead className="text-xs">Price</TableHead>
                  <TableHead className="pr-3 text-right text-xs">MRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planRows.map((row) => (
                  <TableRow key={row.tier}>
                    <TableCell className="pl-3 capitalize text-sm font-medium">{row.tier}</TableCell>
                    <TableCell className="text-sm">{row.count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtMoney(row.price)}</TableCell>
                    <TableCell className="pr-3 text-right text-sm font-medium">{fmtMoney(row.mrr)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold">Recent transactions</h3>
            <p className="text-xs text-muted-foreground">Latest subscription payments (demo)</p>
          </div>
          <Badge variant="outline" className="gap-1 rounded-md">
            <RefreshCw className="h-3 w-3" /> Synced
          </Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-3">Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="pr-3 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_TXNS.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="pl-3 text-sm text-muted-foreground">{new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                <TableCell className="text-sm font-medium">{t.user}</TableCell>
                <TableCell className="capitalize text-sm">{t.plan}</TableCell>
                <TableCell className="text-sm">{fmtMoney(t.amount)}</TableCell>
                <TableCell className="pr-3 text-right">
                  {t.status === "Paid" ? (
                    <Badge className="border-brand/20 bg-brand/10 text-brand">{t.status}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">{t.status}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
