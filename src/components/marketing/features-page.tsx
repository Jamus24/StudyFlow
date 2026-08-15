"use client";

import { useState, useTransition } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/store";
import {
  CalendarRange, Brain, Repeat, Timer, TrendingUp,
  ArrowRight, Sparkles, BookOpen, Target, MessagesSquare,
  BarChart3, Clock, Zap, Lock, Shield, Download, Users, GraduationCap,
  Star, Quote,
} from "lucide-react";
import { LayersIcon } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

type Category = "all" | "planning" | "learning" | "productivity" | "insights";

const CATEGORIES: { label: string; value: Category; icon: typeof CalendarRange }[] = [
  { label: "All", value: "all", icon: LayersIcon },
  { label: "Planning", value: "planning", icon: CalendarRange },
  { label: "Learning", value: "learning", icon: Brain },
  { label: "Productivity", value: "productivity", icon: Timer },
  { label: "Insights", value: "insights", icon: BarChart3 },
];

const BLOCKS: { icon: typeof CalendarRange; t: string; d: string; color: string; cat: Category }[] = [
  { icon: CalendarRange, t: "Adaptive study plans", d: "Study Flow estimates effort per topic, schedules blocks around your real hours, and rebuilds the plan when you fall behind, without making you feel guilty about it.", color: "#2563eb", cat: "planning" },
  { icon: Brain, t: "Context-aware AI tutor", d: "Ask follow-ups without re-explaining. The tutor knows your subject, level and recent sessions, so replies land where you are.", color: "#f59e0b", cat: "learning" },
  { icon: Repeat, t: "Spaced-repetition flashcards", d: "Cards are generated from your notes and rescheduled with an SM-2 algorithm so the hard material comes back before you forget it.", color: "#ef4444", cat: "learning" },
  { icon: Timer, t: "Focus sessions that count", d: "Pomodoro and deep-work sessions log straight into your subjects and feed your weekly stats and streak.", color: "#8b5cf6", cat: "productivity" },
  { icon: LayersIcon, t: "Subjects with goals", d: "Track exam dates, target grades and time invested per subject. See where your hours actually go, not where you meant them to.", color: "#06b6d4", cat: "insights" },
  { icon: TrendingUp, t: "Weekly AI insights", d: "Each week Study Flow writes a short review: what you did, what slipped, and one concrete thing to change next week.", color: "#ec4899", cat: "insights" },
  { icon: BookOpen, t: "Notes that summarise themselves", d: "Paste lecture notes and get a tight summary plus ready-to-review flashcards in seconds.", color: "#f97316", cat: "learning" },
  { icon: Target, t: "Streaks and goals", d: "Set a weekly minute goal. Study Flow tracks your streak and nudges (never nags) to keep momentum.", color: "#06b6d4", cat: "productivity" },
  { icon: MessagesSquare, t: "Threaded tutor history", d: "Every subject can have its own chat. Pin the ones you keep coming back to.", color: "#a855f7", cat: "learning" },
  { icon: BarChart3, t: "Per-subject time tracking", d: "See the real story of where your hours go. Adjust your effort based on data, not guesswork.", color: "#3b82f6", cat: "insights" },
  { icon: Clock, t: "Smart scheduling", d: "Study Flow factors in your class times, breaks, and energy levels. No more studying at midnight when you are wiped.", color: "#2563eb", cat: "planning" },
  { icon: Zap, t: "Exam sprint mode", d: "Intensify your plan in the weeks before an exam. Study Flow shifts focus to high-yield topics and adds review blocks.", color: "#ef4444", cat: "planning" },
];

export function FeaturesPage() {
  const { openAuth } = useUI();
  const [active, setActive] = useState<Category>("all");
  const [isPending, startTransition] = useTransition();

  const filtered = active === "all" ? BLOCKS : BLOCKS.filter((b) => b.cat === active);

  function switchCategory(cat: Category) {
    startTransition(() => {
      setActive(cat);
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="px-4 pb-8 pt-32 sm:px-6 sm:pt-40">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4 rounded-full">Features</Badge>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              A study system, not a to-do list
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Each feature is useful alone. Together they replace the four apps you are juggling,
              and the planner you stopped opening.
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <Button size="lg" className="gap-2 shadow-soft tap-scale" onClick={() => openAuth("register")}>
                Start free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => openAuth("login")}>Sign in</Button>
            </div>
          </div>
        </section>

        {/* category filter tabs */}
        <section className="px-4 pb-12 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((c) => {
              const count = c.value === "all" ? BLOCKS.length : BLOCKS.filter(b => b.cat === c.value).length;
              return (
                <button
                  key={c.value}
                  onClick={() => switchCategory(c.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200",
                    active === c.value
                      ? "border-brand/40 bg-brand/10 text-brand shadow-soft"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/15 hover:text-foreground"
                  )}
                >
                  <c.icon className="h-3.5 w-3.5" />
                  {c.label}
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
                    active === c.value ? "bg-brand/20 text-brand" : "bg-muted text-muted-foreground"
                  )}>{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6">
          <div className={cn(
            "mx-auto grid max-w-6xl transition-all duration-300",
            isPending ? "opacity-40 scale-[0.99]" : "opacity-100 scale-100",
            "gap-5 sm:grid-cols-2 lg:grid-cols-3"
          )}>
            {filtered.map((b, i) => (
              <div key={b.t} className={cn(
                "card-hover group relative overflow-hidden rounded-2xl border border-border bg-card p-6 animate-slide-up-fade",
                `stagger-${Math.min(i + 1, 6)}`
              )}>
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30"
                  style={{ background: b.color }}
                />
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-transparent transition-all duration-300 group-hover:border-foreground/10 group-hover:scale-105"
                  style={{ background: `${b.color}1a`, color: b.color }}
                >
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-sans text-lg font-semibold">{b.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.d}</p>
                <Badge variant="outline" className="mt-4 rounded-md text-[10px] capitalize tag-hover">{b.cat}</Badge>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="mt-12 text-center animate-scale-in">
              <p className="text-sm text-muted-foreground">No features in this category yet.</p>
            </div>
          )}
        </section>

        {/* trust section */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                { icon: Lock, t: "Data encrypted", d: "bcrypt passwords, HTTP-only sessions, encrypted backups" },
                { icon: Shield, t: "POPIA compliant", d: "Your data stays in South Africa. Delete or export anytime." },
                { icon: Download, t: "Export your data", d: "Full JSON export of all your notes, plans, and flashcards." },
              ].map((item) => (
                <div key={item.t} className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-foreground/10 hover:shadow-soft">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand transition-transform duration-200 group-hover:scale-110">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.t}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* mini testimonials */}
        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                { quote: 'Study Flow rewrote my study plan in 30 seconds. I spent 3 hours on Google Calendar.', name: 'Thandi M.', uni: 'UCT', rating: 5 },
                { quote: 'The AI tutor explained SN1 better than my actual lecturer. Five times.', name: 'James K.', uni: 'Stellenbosch', rating: 5 },
                { quote: 'Exam sprint mode turned panic into a plan. Passed with a distinction.', name: 'Priya N.', uni: 'Wits', rating: 5 },
              ].map((t, i) => (
                <div key={t.name} className={cn(
                  'rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-soft hover:border-foreground/10 animate-slide-up-fade',
                  `stagger-${i + 1}`
                )}>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star key={si} className={cn('h-3.5 w-3.5', si < t.rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted')} />
                    ))}
                  </div>
                  <p className="mt-2.5 font-sans italic text-sm leading-relaxed text-foreground/90">{t.quote}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.uni}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-soft sm:p-14">
            <div className='pointer-events-none absolute inset-0 -z-10 bg-brand/[0.03] rounded-3xl' />
            <Sparkles className="mx-auto h-9 w-9 text-brand" />
            <h2 className="mt-4 font-sans text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything above is included in the free plan.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Upgrade to Pro for unlimited AI plans, the tutor, and weekly insights.
            </p>
            <Button className="mt-6 gap-2 shadow-soft tap-scale" size="lg" onClick={() => openAuth("register")}>
              Create your account <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
