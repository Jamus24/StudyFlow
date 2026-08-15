"use client";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUI } from "@/lib/store";
import {
  Sparkles, CalendarRange, MessagesSquare, Brain, Timer,
  ArrowRight, Check, ChevronDown, BookOpen, Target,
  TrendingUp, Zap, Repeat, GraduationCap,
  Shield, Lock, Server, Mail,
  ListChecks, Rocket, RefreshCw, Clock, Users, BarChart3,
  Monitor, Smartphone, Globe, Keyboard,
  Star, Quote, Play, ExternalLink,
  Flame, Snowflake,
} from "lucide-react";
import { LayersIcon } from "@/components/shared/icons";
import { Input } from "@/components/ui/input";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { api } from '@/lib/fetch';

export function Landing() {
  const { setView, openAuth } = useUI();
  return (
    <main className="overflow-hidden">
      <Hero />
      <SocialProof />
      <SectionDivider />
      <ProblemSolution />
      <SectionDivider />
      <Features />
      <TutorShowcase />
      <SectionDivider />
      <FeatureHighlight />
      <SectionDivider />
      <HowItWorks />
      <SectionDivider />
      <Testimonials />
      <StreakSection />
      <Pricing />
      <SectionDivider />
      <FAQ />
      <SectionDivider />
      <SecuritySection />
      <SectionDivider />
      <CompatibilitySection />
      <SectionDivider />
      <NewsletterSection />
      <FinalCTA />
    </main>
  );

  function Hero() {
    return (
      <section className="relative px-4 pt-32 pb-20 sm:px-6 sm:pt-40">
        {/* subtle hero background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-dots opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          {/* animated gradient orbs */}
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand/[0.07] blur-3xl animate-breathe-glow" />
          <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-gold/[0.06] blur-3xl animate-breathe-glow" style={{ animationDelay: '2s' }} />
          <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-brand/[0.04] blur-2xl animate-breathe-glow" style={{ animationDelay: '4s' }} />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="text-center lg:text-left">
            <h1 className="font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Study plans that actually <span className="text-brand">fit your week</span>.
            </h1>

            <p className="mx-auto mt-5 max-w-xl font-sans text-lg italic leading-relaxed text-muted-foreground lg:mx-0">
              Study Flow reads your syllabus, deadlines and available hours, then builds a realistic
              schedule you can follow. Spaced-repetition flashcards and an AI tutor keep the work
              sticking, without the busywork.
            </p>

            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start">
              <Button size="lg" className="h-12 gap-2 px-6 text-base shadow-soft" onClick={() => openAuth("register")}>
                Start free, no card needed
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 gap-2 px-6 text-base" onClick={() => setView("features")}>
                <Sparkles className="h-4 w-4" />
                See how it works
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-500" /> 14-day Pro trial</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-500" /> Works on mobile</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-500" /> Cancel anytime</span>
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>
    );
  }

  function HeroPreview() {
    return (
      <div className="relative">
        <div className="relative rounded-2xl border border-border bg-card p-2.5 shadow-float">
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            {/* mock app top bar */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Logo showWord={false} size={22} />
                <span className="text-sm font-semibold">This week</span>
              </div>
              <div className="flex gap-1">
                <Badge variant="secondary" className="rounded-md text-[10px]">Mon</Badge>
                <Badge className="rounded-md bg-brand text-brand-foreground text-[10px]">Tue</Badge>
                <Badge variant="secondary" className="rounded-md text-[10px]">Wed</Badge>
              </div>
            </div>
            {/* mock plan blocks */}
            <div className="space-y-2 p-4">
              {[
                { t: "16:00", d: "Organic Chemistry · SN1 vs SN2", c: "#2563eb", m: "45m", tag: "Practice" },
                { t: "16:50", d: "Break · walk, hydrate", c: "#94a3b8", m: "10m", tag: "Break" },
                { t: "17:00", d: "Statistics · hypothesis testing", c: "#ef4444", m: "60m", tag: "Problem set" },
                { t: "19:30", d: "Cell Biology · membrane transport", c: "#f59e0b", m: "30m", tag: "Review" },
              ].map((b, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-foreground/15"
                >
                  <div className="h-9 w-1 rounded-full" style={{ background: b.c }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{b.d}</p>
                    <p className="text-[10px] text-muted-foreground">{b.t} · {b.m}</p>
                  </div>
                  <Badge variant="outline" className="rounded-md text-[9px]">{b.tag}</Badge>
                </div>
              ))}
            </div>
            {/* mock stats footer */}
            <div className="grid grid-cols-3 gap-px border-t border-border bg-border">
              {[
                { k: "5h 10m", v: "this week" },
                { k: "8", v: "tasks done" },
                { k: "12 day", v: "streak" },
              ].map((s) => (
                <div key={s.v} className="bg-card px-4 py-3 text-center">
                  <p className="font-display text-base font-semibold text-foreground">{s.k}</p>
                  <p className="text-[10px] text-muted-foreground">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* floating chips */}
        <div
          className="absolute -left-6 top-16 hidden rounded-xl border border-border bg-card p-3 shadow-float sm:block animate-float"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">AI tutor</p>
              <p className="text-xs font-medium">"Explain it again"</p>
            </div>
          </div>
        </div>
        <div
          className="absolute -right-4 bottom-10 hidden rounded-xl border border-border bg-card p-3 shadow-float sm:block animate-float"
          style={{ animationDelay: '2s' }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Repeat className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Review due</p>
              <p className="text-xs font-medium">4 cards · Ochem</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

function SocialProof() {
  const stats = [
    { value: 12000, label: 'Students using Study Flow', icon: Users, format: (n: number) => n.toLocaleString() + '+' },
    { value: 2400, label: 'Flashcards reviewed', icon: Repeat, format: (n: number) => (n / 1000).toFixed(1) + 'M' },
    { value: 48000, label: 'Study plans generated', icon: CalendarRange, format: (n: number) => n.toLocaleString() + '+' },
    { value: 0, label: 'Average rating', icon: Star, staticValue: '4.8/5' },
  ];
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "group relative rounded-2xl border border-border bg-card p-5 text-center transition-all duration-300 hover:border-foreground/10 hover:shadow-soft animate-slide-up-fade",
                `stagger-${i + 1}`
              )}
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 font-display text-2xl font-semibold tabular-nums sm:text-3xl">
                {s.staticValue
                  ? <span>{s.staticValue}</span>
                  : <AnimatedNumber value={s.value} format={s.format} className="font-display text-2xl font-semibold tabular-nums sm:text-3xl" />
                }
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground sm:text-xs">{s.label}</p>
            </div>
          ))}
        </div>
        {/* trust logos strip */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Trusted by students at</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-40">
            {['University of Cape Town', 'Stellenbosch', 'Wits', 'UKZN', 'UJ', 'NWU'].map((name) => (
              <span key={name} className="text-sm font-medium text-foreground sm:text-base">{name}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionDivider() {
  return <div className='mx-auto max-w-6xl px-4 sm:px-6'><div className='border-t border-border' /></div>;
}

function ProblemSolution() {
  const bars = [
    { t: "Reaction mechanisms", h: 6, c: "#2563eb", delay: '0.1s' },
    { t: "Stereochemistry", h: 3, c: "#f59e0b", delay: '0.2s' },
    { t: "Spectroscopy", h: 4, c: "#ef4444", delay: '0.3s' },
    { t: "Synthesis routes", h: 5, c: "#8b5cf6", delay: '0.4s' },
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="outline" className="mb-4 rounded-full">The problem</Badge>
            <h2 className="font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
              You know what to study. The plan is what falls apart.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Most planners hand you a blank calendar. You end up guessing how long things take,
              skipping review, and cramming before exams. Study Flow closes that loop: it estimates the
              work, schedules it around your life, and surfaces what you're forgetting before you
              forget it.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Estimates effort per topic from your syllabus",
                "Blocks study around classes, not over them",
                "Brings back weak material before it slips",
                "Rewrites your plan when life happens",
              ].map((t, i) => (
                <li key={t} className="flex items-start gap-3 animate-slide-up-fade" style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-sm text-foreground/90">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative animate-slide-up-fade stagger-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow duration-300 hover:shadow-float">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <p className="text-sm font-medium">Effort estimate · Ochem midterm</p>
                <Badge variant="secondary" className="rounded-md">AI</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {bars.map((r) => (
                  <div key={r.t}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-foreground/90">{r.t}</span>
                      <span className="text-muted-foreground tabular-nums">~{r.h}h</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full animate-progress-fill"
                        style={{ background: r.c, width: `${r.h * 9}%`, animationDelay: r.delay }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-accent/50 px-3 py-2.5 text-xs">
                <span className="text-muted-foreground">Recommended pace</span>
                <span className="font-medium">2.5h/day · 7 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: CalendarRange, title: "Plans built around your life", desc: "Tell Study Flow your classes and the hours you can actually study. It blocks work around them, not on top of them.", color: "#2563eb" },
  { icon: Brain, title: "An AI tutor that has context", desc: "Ask follow-ups without re-explaining. Study Flow knows the subject, your level and what you worked on this week.", color: "#f59e0b" },
  { icon: Repeat, title: "Flashcards that reschedule", desc: "Generated from your notes, then reviewed on an SM-2 schedule so the hard cards come back sooner.", color: "#ef4444" },
  { icon: Timer, title: "Focus sessions that count", desc: "Pomodoro or deep-work sessions log straight into your subjects and feed your weekly stats.", color: "#8b5cf6" },
  { icon: LayersIcon, title: "Subjects, not just tasks", desc: "Track per-subject goals, exam dates and time invested so you know where you're actually spending effort.", color: "#06b6d4" },
  { icon: TrendingUp, title: "Weekly insights, written for you", desc: "Each week Study Flow summarises what you did, what slipped, and one concrete thing to change.", color: "#ec4899" },
];

function Features() {
  const { setView } = useUI();
  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 rounded-full">Features</Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Six tools that work as one system
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Each piece is useful on its own. Together they replace the four apps you're juggling today.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={cn(
                "card-hover group relative overflow-hidden rounded-2xl border border-border bg-card p-6 animate-fade-in-up",
                i < 6 && `stagger-${i + 1}`
              )}
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
                style={{ background: f.color }}
              />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-transparent transition-all duration-300 group-hover:border-foreground/10 group-hover:scale-105" style={{ background: `${f.color}1a`, color: f.color }}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-sans text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <button onClick={() => setView('features')} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            View all features <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function TutorShowcase() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-soft animate-slide-up-fade stagger-2">
              <div className="rounded-xl border border-border bg-background">
                <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                  <Logo showWord={false} size={18} />
                  <span className="text-xs font-medium">Tutor · Organic Chemistry</span>
                  <Badge variant="secondary" className="ml-auto rounded-md text-[9px]">Context-aware</Badge>
                </div>
                <div className="space-y-3 p-4">
                  <ChatBubble role="user">Why does SN1 give a racemic mixture?</ChatBubble>
                  <ChatBubble role="assistant">
                    SN1 forms a planar carbocation intermediate. The nucleophile can attack
                    from either face with roughly equal probability. Want me to turn the key steps
                    into flashcards?
                  </ChatBubble>
                  <ChatBubble role="user">Yes, and quiz me on one.</ChatBubble>
                  <ChatBubble role="assistant">
                    Card: <strong>What stabilises the carbocation in SN1?</strong> Answer when ready.
                  </ChatBubble>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <Badge variant="outline" className="mb-4 rounded-full">AI tutor</Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Ask the way you'd ask a TA who knows your week.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Study Flow's tutor carries your subject, level and recent sessions into every reply, so
              you don't re-explain context. It can turn answers into flashcards and quiz you on
              the spot.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { icon: MessagesSquare, t: "Threaded history", d: "Pick up any chat later" },
                { icon: Zap, t: "Instant follow-ups", d: "No re-explaining" },
                { icon: BookOpen, t: "Cites uncertainty", d: "Tells you when to verify" },
                { icon: Target, t: "Checks understanding", d: "Asks a question back" },
              ].map((c, i) => (
                <div key={c.t} className={cn("rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-foreground/10 hover:shadow-soft animate-slide-up-fade", `stagger-${i + 1}`)}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110">
                    <c.icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-sm font-medium">{c.t}</p>
                  <p className="text-xs text-muted-foreground">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-md bg-brand text-brand-foreground"
            : "rounded-bl-md bg-muted text-foreground"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function FeatureHighlight() {
  const highlights = [
    {
      icon: Clock,
      title: "Save 4+ hours a week",
      desc: "No more deciding what to study. Study Flow's plan tells you exactly what, when, and for how long. Students report saving significant time each week on planning alone.",
      color: "#2563eb",
      metric: "4.2h",
      metricLabel: "avg. saved/week",
    },
    {
      icon: BarChart3,
      title: "See where your hours go",
      desc: "Per-subject time tracking shows the real story. You might think you're studying physics, but the data might say otherwise. Adjust accordingly.",
      color: "#f59e0b",
      metric: "89%",
      metricLabel: "more accurate planning",
    },
    {
      icon: Users,
      title: "Built for real students",
      desc: "Not a productivity influencer's fantasy. Study Flow handles real constraints: part-time jobs, commute time, exam clusters, and the days you just can't.",
      color: "#8b5cf6",
      metric: "94%",
      metricLabel: "stick past week 2",
    },
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 rounded-full">Why Study Flow</Badge>
          <h2 className="font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for the way students actually work
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Real constraints, real schedules, real results.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {highlights.map((h, i) => (
            <div
              key={h.title}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-soft hover:border-foreground/10",
                `animate-slide-up-fade stagger-${i + 1}`
              )}
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-30"
                style={{ background: h.color }}
              />
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${h.color}1a`, color: h.color }}
              >
                <h.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-sans text-xl font-semibold">{h.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{h.desc}</p>
              {/* inline metric */}
              <div className="mt-5 inline-flex items-baseline gap-1.5 rounded-lg bg-muted/50 px-3 py-2">
                <span className="font-display text-xl font-semibold tabular-nums" style={{ color: h.color }}>{h.metric}</span>
                <span className="text-[11px] text-muted-foreground">{h.metricLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: '01', t: 'Add your subjects', icon: ListChecks, d: 'Drop in subject names, exam dates and target grades. Takes about a minute.' },
    { n: '02', t: 'Generate your plan', icon: Rocket, d: 'Pick a horizon: week, month or exam, and how many hours you have got. Study Flow writes the schedule.' },
    { n: '03', t: 'Study and log', icon: Timer, d: 'Follow the blocks, run focus sessions, and check off tasks. Everything feeds your stats.' },
    { n: '04', t: 'Review and adapt', icon: RefreshCw, d: 'Flashcards reschedule themselves. Each week Study Flow rewrites the plan around what changed.' },
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 rounded-full">How it works</Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            From syllabus to schedule in four moves
          </h2>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className={`group relative bg-card p-6 transition-all duration-300 hover:bg-accent/30 ${i < steps.length - 1 ? 'border-b border-border/50' : ''}`}
            >
              <div className='flex items-center gap-3'>
                <span className='font-display text-3xl font-semibold text-brand/30 transition-colors duration-300 group-hover:text-brand/60'>{s.n}</span>
                <s.icon className='h-5 w-5 text-brand/40 transition-transform duration-300 group-hover:scale-110' />
              </div>
              <h3 className='mt-2 font-mono text-sm font-semibold flex items-center gap-2'>{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="absolute right-4 top-6 hidden h-4 w-4 text-muted-foreground/30 transition-transform duration-300 group-hover:translate-x-0.5 lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      quote: "I went from studying 2 hours a day with nothing to show, to following a plan and actually covering my syllabus. The weekly review keeps me honest.",
      name: "Thandi M.",
      role: "3rd year, Computer Science",
      uni: "UCT",
      rating: 5,
    },
    {
      quote: "The AI tutor is like having a TA who never gets annoyed. I asked it to explain SN1 mechanisms five different ways until it clicked.",
      name: "James K.",
      role: "2nd year, Chemistry",
      uni: "Stellenbosch",
      rating: 5,
    },
    {
      quote: "Exam sprint mode saved me. Two weeks before finals I was panicking. Study Flow reorganised everything into high-yield blocks. Passed with a distinction.",
      name: "Priya N.",
      role: "Honours, Statistics",
      uni: "Wits",
      rating: 5,
    },
    {
      quote: "I tried Notion, Google Calendar, and a paper planner. Study Flow is the first thing that actually tells me what to do when I sit down, instead of just where to write it.",
      name: "Liam B.",
      role: "1st year, Medicine",
      uni: "UKZN",
      rating: 4,
    },
    {
      quote: "The flashcards from my notes are a game changer. I paste my lecture PDF summary and get review-ready cards in seconds. My retention went up noticeably.",
      name: "Fatima Z.",
      role: "3rd year, Law",
      uni: "UJ",
      rating: 5,
    },
    {
      quote: "I'm a part-time student with a job. Study Flow is the only planner that actually accounts for the hours I can't study. That sounds small but it's everything.",
      name: "David R.",
      role: "Part-time, Engineering",
      uni: "NWU",
      rating: 5,
    },
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canScrollLeft = activeIndex > 0;
  const canScrollRight = activeIndex < testimonials.length - 1;

  function scrollTestimonial(direction: 'left' | 'right') {
    const next = direction === 'left' ? activeIndex - 1 : activeIndex + 1;
    if (next >= 0 && next < testimonials.length) {
      setActiveIndex(next);
      scrollRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  return (
    <section id="testimonials" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 rounded-full">Testimonials</Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Students who stopped guessing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Real feedback from students using Study Flow at South African universities.
          </p>
        </div>

        {/* testimonial carousel */}
        <div className="relative mt-14">
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto no-scrollbar pb-4"
          >
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className={cn(
                  'min-w-[300px] max-w-[340px] snap-center flex-shrink-0 rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-soft testimonial-border',
                  i === activeIndex && 'ring-1 ring-brand/20'
                )}
                onClick={() => setActiveIndex(i)}
              >
                {/* stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star
                      key={si}
                      className={cn(
                        'h-4 w-4',
                        si < t.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-muted text-muted'
                      )}
                    />
                  ))}
                </div>
                <Quote className="mt-3 h-5 w-5 text-brand/30" />
                <p className="mt-2 font-sans italic text-sm leading-relaxed text-foreground/90">{t.quote}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-sans text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role} · {t.uni}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* nav arrows */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => scrollTestimonial('left')}
              disabled={!canScrollLeft}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Previous testimonial"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </button>
            <div className="flex gap-1.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveIndex(i);
                    scrollRef.current?.children[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === activeIndex ? 'w-6 bg-brand' : 'w-1.5 bg-border hover:bg-muted-foreground/40'
                  )}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => scrollTestimonial('right')}
              disabled={!canScrollRight}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Next testimonial"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StreakSection() {
  // Mock 7-day streak data
  const days = [
    { day: 'Mon', minutes: 120, done: true },
    { day: 'Tue', minutes: 95, done: true },
    { day: 'Wed', minutes: 0, done: false },
    { day: 'Thu', minutes: 145, done: true },
    { day: 'Fri', minutes: 60, done: true },
    { day: 'Sat', minutes: 180, done: true },
    { day: 'Sun', minutes: 0, done: false },
  ];
  const maxMinutes = Math.max(...days.map(d => d.minutes));
  const streakCount = 5; // consecutive days ending today
  const totalMinutes = days.reduce((a, d) => a + d.minutes, 0);

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 rounded-full">Stay consistent</Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Build a study streak that sticks
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Study Flow tracks your daily study habit. Miss a day? Use a streak freeze. The key is showing up.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Left: streak stats */}
          <div className="flex flex-col gap-5">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current streak</p>
                  <p className="font-display text-3xl font-bold tabular-nums">{streakCount} days</p>
                </div>
              </div>
              <div className="mt-4 flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 flex-1 rounded-full transition-all duration-500',
                      i < streakCount ? 'bg-brand' : 'bg-muted'
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">2 more days to unlock weekly bonus</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-soft hover-lift">
                <p className="text-xs text-muted-foreground">This week</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{Math.round(totalMinutes / 60)}h</p>
                <p className="text-xs text-muted-foreground">{totalMinutes}m total</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-soft hover-lift">
                <p className="text-xs text-muted-foreground">Best day</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">3h</p>
                <p className="text-xs text-muted-foreground">Saturday</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-sky-500" />
                <p className="text-sm font-medium">Streak freezes available</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Miss a day without losing your streak. Pro users get 2 per month, Scholars get unlimited.
              </p>
              <div className="mt-3 flex gap-1.5">
                {[true, true, false].map((active, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-all',
                      active
                        ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        : 'border-border bg-muted/50 text-muted-foreground/40'
                    )}
                  >
                    <Snowflake className="h-3.5 w-3.5" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: weekly bar chart */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">This week</p>
              <Badge variant="secondary" className="rounded-md text-[10px]">5/7 days</Badge>
            </div>
            <div className="mt-6 flex items-end justify-between gap-3" style={{ height: '200px' }}>
              {days.map((d, i) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                  <span className={cn(
                    'text-[10px] font-medium tabular-nums transition-colors',
                    d.done ? 'text-foreground' : 'text-muted-foreground/50'
                  )}>
                    {d.minutes > 0 ? `${d.minutes}m` : '-'}
                  </span>
                  <div className="relative w-full flex-1 flex items-end">
                    <div
                      className={cn(
                        'w-full rounded-t-lg transition-all duration-700 animate-progress-fill',
                        d.done
                          ? 'bg-gradient-to-t from-brand/80 to-brand'
                          : 'bg-muted'
                      )}
                        style={{
                          height: d.minutes > 0 ? `${(d.minutes / maxMinutes) * 100}%` : '8px',
                          animationDelay: `${i * 0.1}s`,
                        }}
                    />
                  </div>
                  <span className={cn(
                    'text-xs font-medium',
                    d.done ? 'text-foreground' : 'text-muted-foreground/50'
                  )}>
                    {d.day}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-xs">
              <span className="text-muted-foreground">Weekly goal</span>
              <span className="font-medium">10h / 15h target</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: "Free", price: 0, cadence: "forever", tier: "free",
    blurb: "For getting your schedule out of your head.",
    cta: "Start free",
    features: ["1 AI plan per week", "Up to 4 subjects", "Pomodoro focus sessions", "Manual flashcards", "7-day stats"],
    highlight: false,
  },
  {
    name: "Pro", price: 9, cadence: "/month", tier: "pro",
    blurb: "For students who want the loop to run itself.",
    cta: "Start 14-day trial",
    features: ["Unlimited AI plans", "Unlimited subjects", "AI tutor (threaded)", "AI flashcard generation", "Weekly AI insights", "Note summaries", "Spaced repetition", "Priority support"],
    highlight: true,
  },
  {
    name: "Scholar", price: 19, cadence: "/month", tier: "scholar",
    blurb: "For exam season when everything is on the line.",
    cta: "Go Scholar",
    features: ["Everything in Pro", "Exam-sprint mode", "Deep focus analytics", "Calendar sync (soon)", "Shared decks", "1:1 study coach (monthly)", "Early feature access"],
    highlight: false,
  },
];

function Pricing() {
  const { openAuth } = useUI();
  const [annual, setAnnual] = useState(false);
  return (
    <section id="pricing" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 rounded-full">Pricing</Badge>
          <h2 className="font-sans text-2xl font-bold uppercase tracking-widest sm:text-3xl">
            One price of a textbook. For the whole term.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when you want the AI doing the heavy lifting.
          </p>
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <button onClick={() => setAnnual(false)} className={`relative rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${!annual ? "text-background" : "text-muted-foreground"}`}>
              {!annual && <span className="absolute inset-0 rounded-full bg-foreground" />}
              <span className="relative">Monthly</span>
            </button>
            <button onClick={() => setAnnual(true)} className={`relative rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${annual ? "text-background" : "text-muted-foreground"}`}>
              {annual && <span className="absolute inset-0 rounded-full bg-foreground" />}
              <span className="relative">Annual <span className="text-brand">-20%</span></span>
            </button>
          </div>
          {annual && (
            <p className="mt-2 text-xs text-brand">
              Save 2 months per year with annual billing
            </p>
          )}
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:shadow-soft animate-slide-up-fade",
                p.highlight
                  ? "glass-card border-brand/40 shadow-float ring-1 ring-brand/20"
                  : "border-border bg-card gradient-border",
                `stagger-${PLANS.indexOf(p) + 1}`
              )}
            >
              {p.highlight && (
                <Badge className="absolute -top-3 left-6 rounded-full bg-brand text-brand-foreground shadow-soft">
                  Most popular
                </Badge>
              )}
              <h3 className="font-sans text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="font-mono text-4xl font-semibold tabular-nums">
                  ${annual && p.price > 0 ? Math.round(p.price * 0.8) : p.price}
                </span>
                <span className="mb-1 text-sm text-muted-foreground">{p.cadence}</span>
              </div>
              <Button
                className="mt-5 tap-scale"
                variant={p.highlight ? "default" : "outline"}
                onClick={() => openAuth("register")}
              >
                {p.cta}
              </Button>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 py-0.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prices in USD. Students get 50% off Scholar with a verified .edu address.
        </p>

        <div className="mt-12 overflow-hidden rounded-2xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Feature</th>
                  <th className="px-4 py-3 text-center font-medium">Free</th>
                  <th className="px-4 py-3 text-center font-medium text-brand">Pro</th>
                  <th className="px-4 py-3 text-center font-medium">Scholar</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI study plans', '1/week', 'Unlimited', 'Unlimited'],
                  ['Subjects', '4', 'Unlimited', 'Unlimited'],
                  ['AI tutor', '', 'Threaded', 'Threaded + priority'],
                  ['Flashcards', 'Manual only', 'AI + SM-2', 'AI + SM-2 + shared'],
                  ['Weekly insights', '', 'AI-written', 'AI-written'],
                  ['Focus sessions', 'Pomodoro', 'Pomodoro + deep', 'All modes + analytics'],
                  ['Support', 'Community', 'Email', 'Email + monthly coach'],
                ].map(([f, free, pro, scholar], i) => (
                  <tr key={f} className={`border-b border-border last:border-b-0 transition-colors hover:bg-muted/20 ${i % 2 ? 'bg-muted/30' : ''}`}>
                    <td className="px-4 py-2.5 text-foreground/90">{f}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{free || '-'}</td>
                    <td className="px-4 py-2.5 text-center">{pro || '-'}</td>
                    <td className="px-4 py-2.5 text-center">{scholar || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "Do I need to give Study Flow my whole syllabus?", a: "No. Adding subjects and exam dates takes about a minute. The more detail you give the AI tutor, the more targeted its answers get, but it works from a one-line subject name." },
    { q: "How does the AI study plan differ from a calendar?", a: "Study Flow estimates effort per topic, schedules blocks around your available hours (not on top of them), and rebuilds the plan when you fall behind. It also suggests when to review material before you forget it." },
    { q: "Is my data private?", a: "Yes. Your notes, plans and chats are tied to your account and never shared with other users. We don't sell data. See the Privacy Policy for the details, and you can export or delete everything from Settings." },
    { q: "Can I cancel anytime?", a: "Yes, one click in Billing. You keep access until the end of your billing cycle, and your data stays so you can resubscribe without losing your decks and plans." },
    { q: "Does it work on mobile?", a: "The whole app is responsive and works offline-first for reading your plan and running focus sessions. Native apps are on the roadmap." },
    { q: "Is there a student discount?", a: "Students with a verified .edu address get 50% off the Scholar plan. Pro is already priced below a textbook." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <Badge variant="outline" className="mb-4 rounded-full">FAQ</Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
          <p className="mt-3 text-muted-foreground">
            Can't find what you're looking for? <button onClick={() => useUI.getState().setView("contact")} className="font-medium text-brand hover:underline">Get in touch</button>.
          </p>
        </div>
        <div className="mt-10 space-y-2.5">
          {faqs.map((f, i) => (
            <div
              key={i}
              className={`overflow-hidden rounded-xl border bg-card transition-all duration-300 ${open === i ? "border-brand/30 shadow-soft" : "border-border hover:border-foreground/10"}`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left ring-focus rounded-xl"
                aria-expanded={open === i}
              >
                <span className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold transition-colors ${open === i ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-sans text-[15px] font-medium">{f.q}</span>
                </span>
                <span className={`shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
              <div className={`grid transition-all duration-300 ease-out ${open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <p className="px-5 pb-4 pl-14 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const items = [
    { icon: Lock, title: "End-to-end encrypted", desc: "Passwords are hashed with bcrypt. Sessions use signed HTTP-only cookies. Your data stays yours." },
    { icon: Shield, title: "No data selling, ever", desc: "We never sell, share, or use your study data for advertising. Your notes and plans are private by default." },
    { icon: Server, title: "Hosted in South Africa", desc: "Your data is stored locally, subject to POPIA. Backups are encrypted at rest." },
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 rounded-full">Security</Badge>
          <h2 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">
            Your study data is yours
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We built Study Flow so you never have to think about where your notes, plans, or tutor conversations end up.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {items.map((item, i) => (
            <div key={item.title} className={cn("group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-soft hover:border-foreground/10 animate-slide-up-fade", `stagger-${i + 1}`)}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-sans text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await api('/api/newsletter', { method: 'POST', json: { email } });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-16">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <div className="relative rounded-2xl border border-border bg-card p-8 shadow-soft text-center overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-30" />
          {submitted ? (
            <div className="animate-bounce-in py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15">
                <Check className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="mt-4 font-sans text-2xl font-semibold tracking-tight">
                You are on the list! 🎉
              </h2>
              <p className="mt-2 text-muted-foreground">
                Check your inbox for a welcome email with your first study tip.
              </p>
            </div>
          ) : (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-sans text-2xl font-semibold tracking-tight sm:text-3xl text-balance">
                Study tips in your inbox
              </h2>
              <p className="mt-3 text-muted-foreground">
                One email per week with a study technique, a schedule template, or an update on what we shipped.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button type="submit" disabled={loading} className="h-11 px-5 tap-scale">
                  {loading ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </form>
              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>No spam. Unsubscribe in one click.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function CompatibilitySection() {
  const items = [
    { icon: Monitor, title: "Desktop browsers", desc: "Chrome, Firefox, Safari, Edge. No install needed." },
    { icon: Smartphone, title: "Mobile and tablet", desc: "Full responsive. Read plans and run focus sessions on the go." },
    { icon: Globe, title: "Offline capable", desc: "Your plans and flashcards work without connection. Sessions sync when you're back." },
    { icon: Keyboard, title: "Keyboard shortcuts", desc: "Press Cmd+K (or Ctrl+K) to open the command palette anywhere in the app." },
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 rounded-full">Works everywhere</Badge>
          <h2 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">
            Study from any device, any connection
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Study Flow runs in your browser. No app store, no install wizard, no waiting.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={item.title}
              className={cn(
                "group rounded-2xl border border-border bg-card p-5 text-center transition-all duration-300 hover:shadow-soft hover:border-foreground/10 animate-slide-up-fade",
                `stagger-${i + 1}`
              )}
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-mono text-xs font-semibold uppercase tracking-wider">{item.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const { openAuth } = useUI();
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-float sm:p-16 gradient-border">
        <div className='pointer-events-none absolute inset-0 -z-10 shimmer-bg rounded-3xl' />
        <div className='pointer-events-none absolute inset-0 -z-10 bg-brand/[0.03] rounded-3xl' />
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-soft animate-zoom-in"
        >
          <GraduationCap className="h-7 w-7" />
        </div>
        <h2 className="mx-auto mt-6 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Stop planning to study. <span className="text-gradient-brand">Start studying the plan.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground text-balance">
          Free to start. Your first AI plan is ready in under a minute. Join 12,000+ students already using Study Flow.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="h-12 gap-2 px-6 text-base shadow-soft tap-scale" onClick={() => openAuth("register")}>
            Create your account
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="ghost" className="h-12 px-6 text-base" onClick={() => openAuth("login")}>
            I already have one
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-500" /> No credit card</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-500" /> 14-day Pro trial</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-500" /> Cancel anytime</span>
        </div>
      </div>
    </section>
  );
}