"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { PanelHeader, LoadingBlock } from "../panel-utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Sparkles, Clock, CheckCircle2, Flame, TrendingUp, Target,
  Brain, ArrowRight, Printer, Share2, Zap, Calendar,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

interface ReviewData {
  week: {
    minutes: number; goalMin: number; goalPct: number; sessions: number;
    tasksDone: number; tasksCreated: number; plans: number; notes: number; decks: number;
    avgFocus: number; streak: number; bestStreak: number; topSubject: string;
    byDay: Record<string, number>;
    bySubject: Record<string, { minutes: number; color: string; sessions: number }>;
    minutes30d: number; sessions30: number;
  };
  insight: string;
  nextSteps: string[];
  period: { start: string; end: string };
}

export { WeeklyReviewPanel as default };

function WeeklyReviewPanel() {
  const setAppRoute = useUI((s) => s.setAppRoute);
  const pushToast = useUI((s) => s.pushToast);
  const { data, isLoading } = useQuery<ReviewData>({
    queryKey: ["/api/weekly-review"],
    queryFn: () => api("/api/weekly-review"),
  });

  if (isLoading || !data) {
    return (
      <div>
        <PanelHeader title="Weekly Review" description="Your week, summarised" icon={Sparkles} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <LoadingBlock key={i} className="h-28" />)}
        </div>
        <div className="mt-4"><LoadingBlock className="h-96" /></div>
      </div>
    );
  }

  const w = data.week;
  const subjectData = Object.entries(w.bySubject).map(([name, v]) => ({ name, minutes: v.minutes, fill: v.color }));
  const dayData = Object.entries(w.byDay).map(([day, minutes]) => ({ day, minutes }));
  const goalReached = w.goalPct >= 100;

  return (
    <div className="print-area">
      <PanelHeader
        title="Weekly Review"
        description={`${formatRange(data.period.start, data.period.end)}`}
        icon={Sparkles}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2 print:hidden" onClick={() => { pushToast({ title: "Sharing", description: "Copied summary link (demo)" }); }}>
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
            <Button size="sm" className="gap-2 print:hidden" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </Button>
          </>
        }
      />

      {/* Hero summary card */}
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className={cn("absolute -right-10 -top-10 h-48 w-48 rounded-full blur-3xl", goalReached ? "bg-blue-500/15" : "bg-brand/10")} />
          <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-[var(--gold)]/10 blur-3xl" />
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 rounded-full">
              <Calendar className="mr-1.5 h-3 w-3" /> Week of {new Date(data.period.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </Badge>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {goalReached ? (
                <>You hit your goal. <span className="text-gradient-brand">Momentum's strong.</span></>
              ) : w.minutes > 0 ? (
                <>{w.goalPct}% of your weekly goal. <span className="text-gradient-brand">Keep going.</span></>
              ) : (
                <>A quiet week. <span className="text-gradient-brand">Let's change that.</span></>
              )}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              {w.minutes > 0
                ? `You studied ${fmtMin(w.minutes)} across ${w.sessions} sessions – that's ${fmtMin(w.minutes30d)} in the last 30 days.`
                : "Log a focus session and your weekly review will populate automatically."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="font-display text-5xl font-semibold tabular-nums">{w.goalPct}%</div>
              <p className="text-xs text-muted-foreground">of goal</p>
            </div>
            <div className="h-16 w-px bg-border" />
            <div className="text-center">
              <div className="font-display text-5xl font-semibold tabular-nums text-brand">{w.streak}</div>
              <p className="text-xs text-muted-foreground">day streak</p>
            </div>
          </div>
        </div>

        {/* goal progress bar */}
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{fmtMin(w.minutes)} of {fmtMin(w.goalMin)} studied</span>
            <span className={cn("font-medium", goalReached ? "text-blue-500" : "text-foreground")}>{goalReached ? "Goal reached" : `${w.goalPct}%`}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand to-[var(--gold)]"
              initial={{ width: 0 }}
              animate={{ width: `${w.goalPct}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={Clock} label="Study time" value={fmtMin(w.minutes)} sub="this week" color="#2563eb" />
        <MiniStat icon={CheckCircle2} label="Tasks done" value={w.tasksDone} sub={`${w.tasksCreated} created`} color="#f59e0b" />
        <MiniStat icon={Brain} label="Avg focus" value={`${w.avgFocus}/100`} sub="self-rated" color="#8b5cf6" />
        <MiniStat icon={Flame} label="Best streak" value={`${w.bestStreak}d`} sub="all-time" color="#ef4444" />
      </div>

      {/* AI insight */}
      {data.insight && (
        <Card className="relative mt-4 overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand/15 blur-2xl" />
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI insight</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{data.insight}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-sm font-semibold">Minutes by day</h3>
          <p className="text-xs text-muted-foreground">When you studied this week</p>
          <div className="mt-4 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
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
          <h3 className="font-display text-sm font-semibold">Time by subject</h3>
          <p className="text-xs text-muted-foreground">Where your effort went</p>
          {subjectData.length ? (
            <>
              <div className="mt-4 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={subjectData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={90} />
                    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`${v} min`, "Studied"]} />
                    <Bar dataKey="minutes" radius={[0, 6, 6, 0]} maxBarSize={20}>
                      {subjectData.map((s, i) => <Cell key={i} fill={s.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {subjectData.slice(0, 4).map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                    <span className="flex-1 truncate text-foreground/80">{s.name}</span>
                    <span className="text-muted-foreground">{fmtMin(s.minutes)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">No sessions this week</div>
          )}
        </Card>
      </div>

      {/* Next steps from AI */}
      {data.nextSteps.length > 0 && (
        <Card className="mt-4 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand" />
            <h3 className="font-display text-sm font-semibold">Suggested for next week</h3>
            <Badge variant="secondary" className="ml-auto rounded-md text-[10px]">AI</Badge>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {data.nextSteps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">{i + 1}</span>
                <span className="text-sm text-foreground/90">{step}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* CTA */}
      <Card className="mt-4 flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="font-display text-sm font-semibold">Ready for next week?</p>
          <p className="text-xs text-muted-foreground">Generate a fresh AI plan based on what you learned this week.</p>
        </div>
        <Button className="gap-2 print:hidden" onClick={() => setAppRoute("plans")}>
          <Sparkles className="h-4 w-4" /> Generate plan
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Card>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub: string; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}1a`, color }}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>
    </Card>
  );
}

function fmtMin(m: number) {
  if (!m) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
function formatRange(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  const opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString(undefined, opt)} – ${e.toLocaleDateString(undefined, opt)}`;
}
