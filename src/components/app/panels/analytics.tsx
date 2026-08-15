"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, Clock, Target, Flame, Zap, Brain,
  ArrowRight, BarChart2, CalendarDays,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from "recharts";
import { useDashboard, useStreak, useInsights } from "@/lib/hooks";
import { useUI } from "@/lib/store";
import { api } from "@/lib/fetch";
import { PanelHeader, StatCard, LoadingBlock, EmptyState } from "../panel-utils";
import { StudyHeatmap } from "@/components/shared/study-heatmap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const reduce =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DOW_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

interface SessionItem {
  id: string;
  startedAt: string;
  durationMin: number;
  focusScore?: number | null;
  subject?: { name: string; color: string } | null;
  mode?: string;
}

type Range = "7d" | "30d";

export function AnalyticsPanel() {
  const dashboard = useDashboard();
  const streak = useStreak();
  const insights = useInsights();
  const { setAppRoute } = useUI();
  const [range, setRange] = useState<Range>("7d");

  // Fetch additional sessions for 30d view
  const sessionsQuery = useQuery<{ sessions: SessionItem[]; total: number }>({
    queryKey: ["/api/sessions", "all"],
    queryFn: async () => {
      const r = await api<{ sessions: SessionItem[]; total: number }>(
        "/api/sessions?page=1&pageSize=100"
      );
      return r;
    },
    enabled: range === "30d",
  });

  const loading = dashboard.isLoading || (range === "30d" && sessionsQuery.isLoading);
  const noData = !dashboard.data || (range === "30d" && !sessionsQuery.data);

  const sessions: SessionItem[] = useMemo(() => {
    if (range === "7d") return (dashboard.data?.sessions7d ?? []) as SessionItem[];
    const cutoff = Date.now() - 30 * 864e5;
    return (sessionsQuery.data?.sessions ?? []).filter((s) => new Date(s.startedAt).getTime() >= cutoff);
  }, [range, dashboard.data, sessionsQuery.data]);

  const days = range === "7d" ? 7 : 30;

  const dailyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(now.getTime() - (days - 1 - i) * 864e5);
      const key = d.toISOString().slice(0, 10);
      const minutes = sessions
        .filter((s) => new Date(s.startedAt).toISOString().slice(0, 10) === key)
        .reduce((sum, s) => sum + s.durationMin, 0);
      return {
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        shortDay: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1),
        date: key,
        minutes,
        tasks: 0,
      };
    });
  }, [sessions, days]);

  const subjectData = useMemo(() => {
    const map = new Map<string, { minutes: number; color: string }>();
    for (const s of sessions) {
      const name = s.subject?.name ?? "General";
      const color = s.subject?.color ?? "#2563eb";
      const prev = map.get(name) ?? { minutes: 0, color };
      prev.minutes += s.durationMin;
      map.set(name, prev);
    }
    return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.minutes - a.minutes);
  }, [sessions]);

  const focusTrend = useMemo(() => {
    return sessions
      .filter((s) => typeof s.focusScore === "number")
      .slice()
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
      .map((s) => ({
        label: new Date(s.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        focus: s.focusScore ?? 0,
      }));
  }, [sessions]);

  // best-study-times heatmap (7 days × 4 time-of-day buckets)
  const heatmap = useMemo(() => buildHeatmap(sessions), [sessions]);
  const totalMinutes = sessions.reduce((s, x) => s + x.durationMin, 0);
  const avgPerSession = sessions.length ? Math.round(totalMinutes / sessions.length) : 0;
  const focusScores = sessions.map((s) => s.focusScore).filter((f): f is number => typeof f === "number");
  const avgFocus = focusScores.length ? Math.round(focusScores.reduce((a, b) => a + b, 0) / focusScores.length) : 0;

  if (loading || noData) {
    return (
      <div>
        <PanelHeader
          title="Analytics"
          description="See where your effort goes"
          icon={BarChart3}
          actions={
            <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as Range)} variant="outline" size="sm" disabled>
              <ToggleGroupItem value="7d" aria-label="Last 7 days">7d</ToggleGroupItem>
              <ToggleGroupItem value="30d" aria-label="Last 30 days">30d</ToggleGroupItem>
            </ToggleGroup>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <LoadingBlock key={i} className="h-28" />)}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <LoadingBlock className="h-72 lg:col-span-2" />
          <LoadingBlock className="h-72" />
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div>
        <PanelHeader
          title="Analytics"
          description="See where your effort goes"
          icon={BarChart3}
          actions={
            <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as Range)} variant="outline" size="sm">
              <ToggleGroupItem value="7d" aria-label="Last 7 days">7d</ToggleGroupItem>
              <ToggleGroupItem value="30d" aria-label="Last 30 days">30d</ToggleGroupItem>
            </ToggleGroup>
          }
        />
        <EmptyState
          icon={BarChart2}
          title="No sessions logged yet"
          description={`Log a study session to see your effort visualised over the last ${days} days.`}
          action={{ label: "Open tasks", onClick: () => setAppRoute("tasks") }}
        />
      </div>
    );
  }

  const goalPct = dashboard.data
    ? Math.min(100, Math.round((dashboard.data.stats.minutes7d / Math.max(1, dashboard.data.stats.weeklyGoalMin)) * 100))
    : 0;

  return (
    <div>
      <PanelHeader
        title="Analytics"
        description="See where your effort goes"
        icon={BarChart3}
        actions={
          <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as Range)} variant="outline" size="sm">
            <ToggleGroupItem value="7d" aria-label="Last 7 days">7d</ToggleGroupItem>
            <ToggleGroupItem value="30d" aria-label="Last 30 days">30d</ToggleGroupItem>
          </ToggleGroup>
        }
      />

      {/* Study heatmap */}
      <StudyHeatmapCard />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Study time · ${range}`}
          value={fmtMin(totalMinutes)}
          sub={`across ${sessions.length} sessions`}
          icon={Clock}
          accent="#2563eb"
          trend={{ dir: goalPct >= 100 ? "up" : "down", value: `${goalPct}%` }}
        />
        <StatCard
          label="Avg per session"
          value={fmtMin(avgPerSession)}
          sub="focused effort"
          icon={Target}
          accent="#f59e0b"
        />
        <StatCard
          label="Focus score"
          value={avgFocus ? `${avgFocus}` : "–"}
          sub={avgFocus ? (avgFocus >= 80 ? "excellent" : avgFocus >= 60 ? "solid" : "room to grow") : "no ratings yet"}
          icon={Brain}
          accent="#8b5cf6"
        />
        <StatCard
          label="Current streak"
          value={`${streak.data?.streak ?? 0}d`}
          sub={`best ${streak.data?.best ?? 0}d`}
          icon={Flame}
          accent="#ef4444"
        />
      </div>

      {/* Main charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Area: study time */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Study time</h3>
              <p className="text-xs text-muted-foreground">Minutes per day · last {days} days</p>
            </div>
            <Badge variant="secondary" className="rounded-md">{fmtMin(totalMinutes)}</Badge>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-study" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  interval={days > 14 ? Math.floor(days / 7) : 0}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <RTooltip
                  cursor={{ stroke: "var(--brand)", strokeDasharray: 3 }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v} min`, "Studied"]}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  fill="url(#grad-study)"
                  dot={{ r: 0 }}
                  activeDot={{ r: 4, fill: "var(--brand)" }}
                  isAnimationActive={!reduce}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie: by subject */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Time by subject</h3>
            <p className="text-xs text-muted-foreground">Where your hours went</p>
          </div>
          {subjectData.length ? (
            <>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={subjectData} dataKey="minutes" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                      {subjectData.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <RTooltip
                      formatter={(v: number, n: string) => [`${v} min`, n]}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {subjectData.slice(0, 5).map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="flex-1 truncate text-foreground/80">{s.name}</span>
                    <span className="text-muted-foreground">{fmtMin(s.minutes)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
              No subject breakdown available.
            </div>
          )}
        </Card>
      </div>

      {/* Secondary row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Tasks done bar */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Sessions per day</h3>
            <p className="text-xs text-muted-foreground">How often you showed up</p>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="shortDay"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  interval={days > 14 ? Math.floor(days / 7) : 0}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                <RTooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v} session${v === 1 ? "" : "s"}`, "Logged"]}
                  labelFormatter={(l) => dailyData.find((d) => d.shortDay === l)?.day ?? l}
                />
                <Bar dataKey="tasks" name="Sessions" radius={[5, 5, 0, 0]} fill="var(--gold)" maxBarSize={28} isAnimationActive={!reduce} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Focus trend line */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Focus score trend</h3>
            <p className="text-xs text-muted-foreground">Self-rated per session</p>
          </div>
          {focusTrend.length ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={focusTrend} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={Math.max(0, Math.floor(focusTrend.length / 6))} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <RTooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${v}/100`, "Focus"]}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Line type="monotone" dataKey="focus" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 2, fill: "#8b5cf6" }} activeDot={{ r: 4 }} isAnimationActive={!reduce} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
              Rate your focus when logging sessions to see a trend.
            </div>
          )}
        </Card>

        {/* AI insight */}
        <Card className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand/15 blur-2xl" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand"><Brain className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-semibold">AI weekly insight</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Auto-generated</p>
            </div>
          </div>
          <div className="mt-3 min-h-[120px] text-sm leading-relaxed text-foreground/85">
            {insights.isLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground"><Zap className="h-3.5 w-3.5 animate-pulse" /> Writing your review…</span>
            ) : insights.data?.insight ? (
              insights.data.insight
            ) : (
              "Keep logging sessions – Study Flow will write a short weekly review with one concrete suggestion."
            )}
          </div>
          {insights.data && (
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <span className="rounded-md bg-muted px-1.5 py-0.5">{fmtMin(insights.data.minutes)} studied</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5">{insights.data.tasksDone} tasks done</span>
              {insights.data.topSubject && (
                <span className="rounded-md bg-muted px-1.5 py-0.5">Top: {insights.data.topSubject}</span>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Best study times heatmap */}
      <Card className="mt-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold">When you study best</h3>
            <p className="text-xs text-muted-foreground">Session density by day of week × time of day · last {days} days</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              {[0.1, 0.3, 0.55, 0.8, 1].map((o, i) => (
                <span key={i} className="h-3 w-3 rounded-sm" style={{ background: `color-mix(in oklch, var(--brand) ${o * 100}%, transparent)` }} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
        <Heatmap data={heatmap} />
      </Card>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" className="gap-1 text-brand hover:text-brand" onClick={() => setAppRoute("calendar")}>
          See schedule <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Heatmap ---------------- */

const TIME_BUCKETS = ["Morning", "Midday", "Afternoon", "Evening"];

function buildHeatmap(sessions: SessionItem[]) {
  // [dayIndex 0-6][bucket 0-3] = count
  const grid: number[][] = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const dow = d.getDay();
    const h = d.getHours();
    const bucket = h < 12 ? 0 : h < 14 ? 1 : h < 17 ? 2 : 3;
    grid[dow][bucket] += 1;
  }
  const max = Math.max(1, ...grid.flat());
  return { grid, max };
}

function Heatmap({ data }: { data: { grid: number[][]; max: number } }) {
  const { grid, max } = data;
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[44px_repeat(4,1fr)] gap-1.5 sm:grid-cols-[60px_repeat(4,1fr)]">
        <div />
        {TIME_BUCKETS.map((b) => (
          <div key={b} className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span className="hidden sm:inline">{b}</span>
            <span className="sm:hidden">{b.slice(0, 2)}</span>
          </div>
        ))}
        {grid.map((row, dow) => (
          <Row key={dow} dow={dow} row={row} max={max} />
        ))}
      </div>
    </div>
  );
}

function Row({ dow, row, max }: { dow: number; row: number[]; max: number }) {
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow];
  return (
    <>
      <div className="flex items-center text-[11px] font-medium text-muted-foreground">
        <span className="hidden sm:inline">{dayName}</span>
        <span className="sm:hidden">{DOW_SHORT[dow]}</span>
      </div>
      {row.map((count, i) => {
        const intensity = max > 0 ? count / max : 0;
        return (
          <div
            key={i}
            title={`${dayName} ${TIME_BUCKETS[i]} · ${count} session${count === 1 ? "" : "s"}`}
            className={cn(
              "flex h-9 items-center justify-center rounded-md text-[10px] font-medium transition-all sm:h-11",
              count > 0 ? "text-foreground" : "text-muted-foreground/50"
            )}
            style={{
              background:
                count > 0
                  ? `color-mix(in oklch, var(--brand) ${20 + intensity * 80}%, var(--muted))`
                  : "var(--muted)",
            }}
          >
            {count > 0 ? count : ""}
          </div>
        );
      })}
    </>
  );
}

/* ---------------- Helpers ---------------- */

function fmtMin(m: number) {
  if (!m) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function StudyHeatmapCard() {
  const { data, isLoading } = useQuery<{ data: { date: string; minutes: number }[] }>({
    queryKey: ["/api/heatmap"],
    queryFn: () => api("/api/heatmap"),
  });

  return (
    <Card className="mt-4 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand" />
          <h3 className="font-display text-sm font-semibold">Study consistency</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">Last 20 weeks</span>
      </div>
      {isLoading ? (
        <div className="relative h-24 overflow-hidden rounded-lg bg-muted/30">
          <div className="skeleton-shimmer absolute inset-0" />
        </div>
      ) : (
        <StudyHeatmap data={data?.data ?? []} weeks={20} />
      )}
    </Card>
  );
}

export { AnalyticsPanel as default };
