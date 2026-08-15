"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDashboard, useStreak, useInsights } from "@/lib/hooks";
import { useUI } from "@/lib/store";
import { api } from "@/lib/fetch";
import { PanelHeader, StatCard, LoadingBlock } from "../panel-utils";
import { StreakShopCard } from "../streak-shop-card";
import { DailyChallengeCard } from "../daily-challenge-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Clock, CheckCircle2, FolderKanban, Flame, ArrowRight, Plus, Zap, Brain, TrendingUp, CalendarClock, Target, Trash2, Snowflake, AlertCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { LayersIcon } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DashboardPanel() {
  const { data, isLoading } = useDashboard();
  const streak = useStreak();
  const insights = useInsights();
  const { setAppRoute } = useUI();

  const weekData = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 864e5);
      const key = d.toISOString().slice(0, 10);
      return { day: DOW[d.getDay()], minutes: data.byDay[key] ?? 0 };
    });
  }, [data]);

  const subjectData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.bySubject).map(([name, v]) => ({ name, minutes: (v as any).minutes, fill: (v as any).color }));
  }, [data]);

  const goalPct = data ? Math.min(100, Math.round((data.stats.minutes7d / Math.max(1, data.stats.weeklyGoalMin)) * 100)) : 0;

  if (isLoading || !data) {
    return (
      <div>
        <PanelHeader title="Dashboard" description="Your week at a glance" icon={Sparkles} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <LoadingBlock key={i} className="h-28" />)}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3"><LoadingBlock className="h-72 lg:col-span-2" /><LoadingBlock className="h-72" /></div>
      </div>
    );
  }

  return (
    <div>
      <PanelHeader
        title={`Good ${greeting()}, ${data.user.name.split(" ")[0]}`}
        description={greetingSub(data.stats.minutes7d, data.stats.weeklyGoalMin)}
        icon={Sparkles}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAppRoute("tasks")}>
              <Plus className="h-4 w-4" /> Task
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setAppRoute("plans")}>
              <Sparkles className="h-4 w-4" /> New plan
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Study time" value={fmtMin(data.stats.minutes7d)} sub={`of ${fmtMin(data.stats.weeklyGoalMin)} goal`} icon={Clock} trend={{ dir: goalPct >= 100 ? "up" : "down", value: `${goalPct}%` }} accent="#2563eb" />
        <StatCard label="Tasks done" value={data.stats.tasksDone7d} sub="this week" icon={CheckCircle2} accent="#f59e0b" />
        <StreakCard streak={streak.data} />
        <StatCard label="Open tasks" value={data.stats.openTasks} sub={`${data.stats.subjects} subjects`} icon={FolderKanban} accent="#8b5cf6" />
      </div>

      <Card className="mt-4 overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium">Weekly goal</p>
            <p className="text-xs text-muted-foreground">{fmtMin(data.stats.minutes7d)} of {fmtMin(data.stats.weeklyGoalMin)} studied</p>
          </div>
          <span className={cn("font-display text-2xl font-semibold", goalPct >= 100 ? "text-blue-500" : "text-foreground")}>{goalPct}%</span>
        </div>
        <div className="h-2 w-full bg-muted">
          <div className="h-full bg-gradient-to-r from-brand to-[var(--gold)] transition-all duration-700" style={{ width: `${goalPct}%` }} />
        </div>
      </Card>

      <SmartSuggestions />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Study this week</h3>
              <p className="text-xs text-muted-foreground">Minutes per day</p>
            </div>
            <Badge variant="secondary" className="rounded-md">{fmtMin(data.stats.minutes7d)}</Badge>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`${v} min`, "Studied"]} />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]} fill="var(--brand)" maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">By subject</h3>
            <p className="text-xs text-muted-foreground">Where your hours went</p>
          </div>
          {subjectData.length ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={subjectData} dataKey="minutes" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={3} strokeWidth={0}>
                    {subjectData.map((s, i) => <Cell key={i} fill={s.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [`${v} min`, n]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="flex h-[140px] items-center justify-center text-xs text-muted-foreground">No sessions yet</div>}
          <div className="mt-3 space-y-1.5">
            {subjectData.slice(0, 4).map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.fill }} />
                <span className="flex-1 truncate text-foreground/80">{s.name}</span>
                <span className="text-muted-foreground">{fmtMin(s.minutes)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <GoalsCard />
        <DailyChallengeCard />
      </div>
      <StreakShopCard />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-5 lg:col-span-1">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand/15 blur-2xl" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand"><Brain className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-semibold">AI weekly insight</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Auto-generated</p>
            </div>
          </div>
          <div className="mt-3 min-h-[88px] text-sm leading-relaxed text-foreground/85">
            {insights.isLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground"><Zap className="h-3.5 w-3.5 animate-pulse" /> Writing your review…</span>
            ) : insights.data?.insight ? (
              insights.data.insight
            ) : (
              "Log a couple of sessions and Study Flow will write a short weekly review with one concrete suggestion."
            )}
          </div>
          <Button variant="ghost" size="sm" className="mt-2 gap-1 px-0 text-brand hover:text-brand" onClick={() => setAppRoute("analytics")}>
            See analytics <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-display text-sm font-semibold">Due soon</h3>
            </div>
            <button onClick={() => setAppRoute("tasks")} className="text-xs text-muted-foreground hover:text-foreground">View all</button>
          </div>
          {data.dueSoon.length ? (
            <div className="space-y-2">
              {data.dueSoon.slice(0, 5).map((t: any) => (
                <button key={t.id} onClick={() => setAppRoute("tasks")} className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-foreground/15">
                  <span className="h-2 w-2 rounded-full" style={{ background: t.subject?.color || "#94a3b8" }} />
                  <span className="flex-1 truncate text-sm">{t.title}</span>
                  {t.dueDate && <span className="text-[10px] text-muted-foreground">{dueLabel(t.dueDate)}</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">Nothing due in the next 3 days.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-display text-sm font-semibold">Recent activity</h3>
            </div>
            <button onClick={() => setAppRoute("activity")} className="text-xs text-muted-foreground hover:text-foreground">View all</button>
          </div>
          <div className="space-y-3">
            {data.activity.slice(0, 6).map((a: any) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px]">
                  {actionIcon(a.action)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground/90">{actionLabel(a.action, a.meta)}</p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</p>
                </div>
              </div>
            ))}
            {!data.activity.length && <p className="py-6 text-center text-xs text-muted-foreground">No activity yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
function greetingSub(min: number, goal: number) {
  if (min >= goal) return "You've hit your weekly goal – momentum looks strong.";
  const pct = Math.round((min / Math.max(1, goal)) * 100);
  return `${pct}% of your weekly goal. ${pct < 50 ? "A short session today keeps it moving." : "Keep the streak going."}`;
}
function fmtMin(m: number) {
  if (!m) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
function dueLabel(iso: string) {
  const d = new Date(iso);
  const days = Math.ceil((d.getTime() - Date.now()) / 864e5);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function actionLabel(action: string, meta?: string) {
  switch (action) {
    case "task.completed": return `Completed ${meta || "a task"}`;
    case "task.created": return `Added task ${meta || ""}`;
    case "session.logged": return `Studied ${meta || ""}`;
    case "plan.generated": return `Generated plan · ${meta || ""}`;
    case "subject.created": return `Added subject ${meta || ""}`;
    case "deck.created": return `Created deck ${meta || ""}`;
    case "note.created": return `Wrote a note · ${meta || ""}`;
    case "tutor.message": return `Asked the tutor`;
    case "auth.login": return "Signed in";
    case "auth.register": return "Created account";
    case "billing.upgrade": return `Upgraded · ${meta || ""}`;
    default: return action.replace(/[._]/g, " ");
  }
}
function actionIcon(action: string) {
  if (action.includes("task")) return "✓";
  if (action.includes("session")) return "⏱";
  if (action.includes("plan")) return "✨";
  if (action.includes("subject")) return "📚";
  if (action.includes("deck")) return "🃏";
  if (action.includes("note")) return "📝";
  if (action.includes("tutor")) return "🧠";
  return "•";
}

interface Goal {
  id: string;
  subjectId: string | null;
  subject?: { id: string; name: string; color: string } | null;
  type: string;
  targetMin: number;
  periodStart: string;
  periodEnd: string;
  minutesStudied: number;
  pct: number;
}

function StreakCard({ streak }: { streak?: { streak: number; best: number; studiedToday: boolean; freezesUsed: number; freezesAvailable: number } }) {
  const { pushToast } = useUI();
  const qc = useQueryClient();
  const [freezing, setFreezing] = useState(false);
  const s = streak?.streak ?? 0;
  const best = streak?.best ?? 0;
  const studiedToday = streak?.studiedToday ?? false;
  const freezesAvailable = streak?.freezesAvailable ?? 0;

  // can freeze if: didn't study today, has freezes, and yesterday might be a gap
  const canFreeze = !studiedToday && freezesAvailable > 0;

  async function handleFreeze() {
    setFreezing(true);
    try {
      const res = await api<{ ok: boolean; frozenDate: string; freezesAvailable: number }>("/api/streak/freeze", { method: "POST" });
      pushToast({ title: "Streak frozen", description: "Yesterday is protected. Keep going today!", variant: "success" });
      qc.invalidateQueries({ queryKey: ["/api/streak"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    } catch (e: any) {
      pushToast({ title: "Can't freeze", description: e.message, variant: "destructive" });
    } finally {
      setFreezing(false);
    }
  }

  return (
    <div className="card-hover relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10 blur-2xl" style={{ background: "#ef4444" }} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Streak</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#ef44441a", color: "#ef4444" }}>
          <Flame className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight tabular-nums">{s}d</p>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">best {best}d</span>
        {freezesAvailable > 0 && (
          <span className="flex items-center gap-0.5 text-cyan-600 dark:text-cyan-400" title={`${freezesAvailable} streak freeze${freezesAvailable > 1 ? "s" : ""} available`}>
            · <Snowflake className="h-3 w-3" /> {freezesAvailable}
          </span>
        )}
      </div>
      {canFreeze && (
        <button
          onClick={handleFreeze}
          disabled={freezing}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-400 transition-colors hover:bg-cyan-500/20 disabled:opacity-50"
        >
          <Snowflake className="h-3 w-3" /> {freezing ? "Freezing..." : "Freeze yesterday"}
        </button>
      )}
    </div>
  );
}

interface Suggestion {
  id: string;
  type: "task" | "review" | "plan" | "break" | "goal" | "tutor";
  title: string;
  description: string;
  action: string;
  priority: "high" | "medium" | "low";
  icon: string;
}

function SmartSuggestions() {
  const { setAppRoute } = useUI();
  const { data, isLoading } = useQuery<{ suggestions: Suggestion[] }>({
    queryKey: ["/api/smart-suggestions"],
    queryFn: () => api("/api/smart-suggestions"),
    refetchInterval: 120_000,
  });

  const suggestions = data?.suggestions ?? [];

  const iconMap: Record<string, any> = {
    alert: AlertCircle, flame: Flame, layers: LayersIcon, check: CheckCircle2,
    sparkles: Sparkles, target: Target, folder: FolderKanban, brain: Brain,
  };

  const priorityColors = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#2563eb",
  };

  if (isLoading) {
    return (
      <Card className="mt-4 p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative h-4 w-4">
            <div className="absolute inset-0 animate-ping rounded-full bg-brand/40" />
            <div className="relative h-4 w-4 rounded-full bg-brand/20" />
          </div>
          <h3 className="font-display text-sm font-semibold">Smart suggestions</h3>
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="relative h-14 overflow-hidden rounded-lg border border-border bg-muted/30">
              <div className="skeleton-shimmer absolute inset-0" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!suggestions.length) {
    return (
      <Card className="mt-4 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-500" />
          <h3 className="font-display text-sm font-semibold">All caught up</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">No urgent actions right now. Keep up the great work!</p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative h-4 w-4">
            <div className="absolute inset-0 animate-ping rounded-full bg-brand/40" />
            <div className="relative h-4 w-4 rounded-full bg-brand/20" />
          </div>
          <h3 className="font-display text-sm font-semibold">Smart suggestions</h3>
          <Badge variant="secondary" className="rounded-md text-[9px]">AI-powered</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{suggestions.length} action{suggestions.length > 1 ? "s" : ""}</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.slice(0, 6).map((s, i) => {
          const Icon = iconMap[s.icon] || Sparkles;
          const color = priorityColors[s.priority];
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setAppRoute(s.action as any)}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-left transition-all hover:border-foreground/15 hover:shadow-soft"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}1a`, color }}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {s.priority === "high" && (
                  <span className="flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight text-foreground">{s.title}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.description}</p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-brand">
                Go <ArrowRight className="h-2.5 w-2.5" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}

function GoalsCard() {
  const { pushToast } = useUI();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subjectId: "", type: "weekly" as "weekly" | "daily" | "exam", targetMin: 180 });

  const { data, isLoading } = useQuery<{ goals: Goal[] }>({
    queryKey: ["/api/goals"],
    queryFn: () => api("/api/goals"),
    refetchInterval: 60_000,
  });

  const create = useMutation({
    mutationFn: (payload: typeof form) =>
      api("/api/goals", { method: "POST", json: { ...payload, subjectId: payload.subjectId || null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/goals"] });
      pushToast({ title: "Goal added", variant: "success" });
      setOpen(false);
      setForm({ subjectId: "", type: "weekly", targetMin: 180 });
    },
    onError: (e: any) => pushToast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/goals"] }),
  });

  // need subjects for the dropdown – fetch from dashboard query already loaded by parent
  const { data: dash } = useDashboard();
  const subjects = dash?.subjects ?? [];

  const goals = data?.goals ?? [];

  return (
    <Card className="mt-4 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-brand" />
          <h3 className="font-display text-sm font-semibold">Study goals</h3>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New goal
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="relative h-16 overflow-hidden rounded-lg border border-border bg-muted/30">
              <div className="skeleton-shimmer absolute inset-0" />
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <Target className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No active goals yet.</p>
          <p className="text-xs text-muted-foreground/70">Set a per-subject target to track progress against.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {goals.map((g) => {
              const color = g.subject?.color || "#2563eb";
              const reached = g.pct >= 100;
              const daysLeft = Math.max(0, Math.ceil((new Date(g.periodEnd).getTime() - Date.now()) / 864e5));
              return (
                <motion.div
                  key={g.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="group rounded-xl border border-border bg-card p-3.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="flex-1 truncate text-sm font-medium">
                      {g.subject?.name ?? "All subjects"}
                    </span>
                    <Badge variant="outline" className="rounded-md text-[9px] uppercase tracking-wider">
                      {g.type}
                    </Badge>
                    {reached && (
                      <Badge className="rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px]">
                        <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> Done
                      </Badge>
                    )}
                    <button
                      onClick={() => remove.mutate(g.id)}
                      className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${color}, var(--gold))` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${g.pct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {fmtMin(g.minutesStudied)}/{fmtMin(g.targetMin)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {daysLeft === 0 ? "Ends today" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`} · {g.pct}%
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogTitle className="font-display text-lg font-semibold">New study goal</DialogTitle>
          <p className="text-sm text-muted-foreground">Track progress against a per-subject target.</p>
          <div className="mt-4 space-y-4">
            <div>
              <Label className="mb-1.5 text-xs font-medium">Subject</Label>
              <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All subjects" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-medium">Period</Label>
              <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (24h)</SelectItem>
                  <SelectItem value="weekly">Weekly (7 days)</SelectItem>
                  <SelectItem value="exam">Exam sprint (30 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 flex items-center justify-between text-xs font-medium">
                <span>Target minutes</span>
                <span className="font-mono text-brand">{fmtMin(form.targetMin)}</span>
              </Label>
              <Input
                type="range" min={30} max={600} step={30}
                value={form.targetMin}
                onChange={(e) => setForm({ ...form, targetMin: Number(e.target.value) })}
                className="h-2 cursor-pointer p-0"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>30m</span><span>5h</span><span>10h</span>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={create.isPending} onClick={() => create.mutate(form)} className="gap-1.5">
              {create.isPending ? "Saving…" : "Create goal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export { DashboardPanel as default };
