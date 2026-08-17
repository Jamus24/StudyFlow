"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard, Check, Sparkles, Loader2, ShieldCheck, CalendarClock,
  CheckCircle2, Clock, TrendingUp, ExternalLink, Info,
} from "lucide-react";
import { api } from "@/lib/fetch";
import { useUI, useAuthStore, type ClientUser } from "@/lib/store";
import { useDashboard } from "@/lib/hooks";
import { PanelHeader, LoadingBlock } from "../panel-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MeResponse {
  user: (ClientUser & { createdAt?: string }) | null;
}

type Tier = "free" | "pro" | "scholar";

interface PlanDef {
  tier: Tier;
  name: string;
  monthly: number;
  yearly: number;
  blurb: string;
  features: string[];
  highlight?: boolean;
  priceId?: "pro_monthly" | "pro_yearly" | "scholar_monthly" | "scholar_yearly";
}

const PLANS: PlanDef[] = [
  {
    tier: "free",
    name: "Free",
    monthly: 0,
    yearly: 0,
    blurb: "For getting your schedule out of your head.",
    features: [
      "Dashboard & streak tracking",
      "Up to 4 subjects",
      "Pomodoro focus timer",
      "Task management",
      "Manual flashcards",
      "7-day stats on dashboard",
      "Leaderboard & achievements",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    monthly: 9,
    yearly: 86,
    blurb: "For students who want the loop to run itself.",
    highlight: true,
    priceId: "pro_monthly",
    features: [
      "Everything in Free",
      "Unlimited AI study plans",
      "Unlimited subjects",
      "AI tutor (threaded chat)",
      "AI flashcard generation",
      "Weekly AI insights & review",
      "Note AI summaries",
      "Spaced repetition",
      "Full analytics",
      "Data export",
      "Priority support",
    ],
  },
  {
    tier: "scholar",
    name: "Scholar",
    monthly: 19,
    yearly: 182,
    blurb: "For exam season when everything is on the line.",
    priceId: "scholar_monthly",
    features: [
      "Everything in Pro",
      "Exam prep AI strategist",
      "Mock quizzes (AI-generated)",
      "Deep focus analytics",
      "Study groups (create & manage)",
      "Calendar sync (soon)",
      "Shared decks",
      "1:1 study coach (monthly)",
      "Early feature access",
    ],
  },
];

const HISTORY = [
  { date: "2025-04-01", plan: "Pro · monthly", amount: "$9.00", status: "Paid" },
  { date: "2025-03-01", plan: "Pro · monthly", amount: "$9.00", status: "Paid" },
  { date: "2025-02-01", plan: "Pro · monthly", amount: "$9.00", status: "Paid" },
];

export function BillingPanel() {
  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ["/api/auth/me", "billing"],
    queryFn: () => api<MeResponse>("/api/auth/me"),
  });
  const dashboard = useDashboard();
  const pushToast = useUI((s) => s.pushToast);
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  // Handle ?billing=success|canceled URL params from Stripe redirect
  const [billingResult, setBillingResult] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (billing === "success" || billing === "canceled") {
      window.history.replaceState({}, "", window.location.pathname);
      return billing;
    }
    return null;
  });

  // Re-fetch user data after Stripe redirect
  useEffect(() => {
    if (billingResult === "success") {
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    }
  }, [billingResult, qc]);

  // Dismiss result banner after 8s
  useEffect(() => {
    if (!billingResult) return;
    const t = setTimeout(() => setBillingResult(null), 8000);
    return () => clearTimeout(t);
  }, [billingResult]);

  const checkout = useMutation({
    mutationFn: (priceId: string) =>
      api<{ mode: string; url?: string; subscription?: { planTier: string; planStatus: string }; label: string }>("/api/billing/checkout", {
        method: "POST",
        json: { priceId },
      }),
    onSuccess: (r, priceId) => {
      if (r.mode === "stripe" && r.url) {
        // Redirect to Stripe Checkout
        window.location.href = r.url;
        return;
      }
      // Demo mode — update immediately
      const tier = PLANS.find((p) => p.priceId === priceId)?.tier;
      if (data?.user && tier) {
        setUser({ ...data.user, planTier: tier, planStatus: r.subscription?.planStatus || "active" });
      }
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      pushToast({ title: "Plan upgraded (demo)", description: `You're now on ${r.label}. No real charges.`, variant: "success" });
    },
    onError: (e: Error) => pushToast({ title: "Could not start checkout", description: e.message, variant: "destructive" }),
  });

  const portal = useMutation({
    mutationFn: () => api<{ url: string }>("/api/billing/portal", { method: "POST" }),
    onSuccess: (r) => { window.location.href = r.url; },
    onError: (e: Error) => pushToast({ title: "Could not open portal", description: e.message, variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: () => api<{ subscription: { planTier: string; planStatus: string } }>("/api/billing", { method: "DELETE" }),
    onSuccess: (r) => {
      if (data?.user) {
        setUser({ ...data.user, planTier: r.subscription.planTier, planStatus: r.subscription.planStatus });
      }
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      pushToast({ title: "Subscription canceled", description: "You've been downgraded to Free.", variant: "default" });
    },
    onError: (e: Error) => pushToast({ title: "Could not cancel", description: e.message, variant: "destructive" }),
  });

  if (isLoading || !data?.user) {
    return (
      <div>
        <PanelHeader title="Billing" description="Manage your subscription" icon={CreditCard} />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <LoadingBlock key={i} className="h-72" />)}
        </div>
      </div>
    );
  }

  const user = data.user;
  const currentTier = (user.planTier || "free") as Tier;
  const isPaid = currentTier !== "free";
  const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const isTrialing = user.planStatus === "trialing" && trialEndsAt;

  // weekly usage
  const weeklyMin = dashboard.data?.stats.minutes7d ?? 0;
  const weeklyGoal = dashboard.data?.stats.weeklyGoalMin ?? user.weeklyGoalMin ?? 420;
  const tasksDone = dashboard.data?.stats.tasksDone7d ?? 0;
  const usagePct = Math.min(100, Math.round((weeklyMin / Math.max(1, weeklyGoal)) * 100));

  return (
    <div>
      <PanelHeader title="Billing" description="Manage your subscription" icon={CreditCard} />

      {/* Success/canceled banner from Stripe redirect */}
      {billingResult === "success" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 p-4"
        >
          <CheckCircle2 className="h-5 w-5 text-brand" />
          <div>
            <p className="text-sm font-medium">Payment successful! 🎉</p>
            <p className="text-xs text-muted-foreground">Your subscription is now active.</p>
          </div>
        </motion.div>
      )}
      {billingResult === "canceled" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
        >
          <Info className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium">Checkout canceled</p>
            <p className="text-xs text-muted-foreground">No charges were made. Try again anytime.</p>
          </div>
        </motion.div>
      )}

      {/* Current plan */}
      <Card className="relative overflow-hidden p-0">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/15 blur-2xl" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              currentTier === "scholar" ? "bg-amber-500/15 text-amber-500" :
              currentTier === "pro" ? "bg-brand/15 text-brand" :
              "bg-muted text-muted-foreground"
            )}>
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-semibold capitalize">{currentTier}</h2>
                <StatusBadge status={user.planStatus} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {currentTier === "free" ? "Free forever." : `Billed ${cycle}.`}{" "}
                {isTrialing && (
                  <span className="text-amber-600 dark:text-amber-400">
                    Trial ends {trialEndsAt!.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.
                  </span>
                )}
              </p>
            </div>
          </div>

          {isPaid && (
            <div className="flex gap-2">
              {!user.stripeSubId?.startsWith("sub_demo_") && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                >
                  {portal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Manage in Stripe
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Usage */}
        <div className="grid gap-4 border-t border-border bg-muted/30 p-5 sm:grid-cols-3">
          <UsageMetric
            icon={Clock}
            label="This week"
            value={fmtMin(weeklyMin)}
            sub={`of ${fmtMin(weeklyGoal)} goal`}
            pct={usagePct}
          />
          <UsageMetric
            icon={CheckCircle2}
            label="Tasks done"
            value={`${tasksDone}`}
            sub="this week"
          />
          <UsageMetric
            icon={TrendingUp}
            label="Renews"
            value={currentTier === "free" ? "–" : cycle === "monthly" ? "monthly" : "yearly"}
            sub={currentTier === "free" ? "Upgrade anytime" : "auto-renews"}
          />
        </div>
      </Card>

      {/* Plans */}
      <div className="mt-5 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Available plans</h3>
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            onClick={() => setCycle("monthly")}
            className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", cycle === "monthly" ? "bg-foreground text-background" : "text-muted-foreground")}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", cycle === "yearly" ? "bg-foreground text-background" : "text-muted-foreground")}
          >
            Annual <span className="text-brand">−20%</span>
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan, i) => {
          const isCurrent = currentTier === plan.tier;
          const price = cycle === "monthly" ? plan.monthly : Math.round(plan.yearly / 12);
          return (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className={cn(
                "relative flex flex-col rounded-2xl border p-5",
                plan.highlight ? "border-brand/40 bg-card shadow-float ring-1 ring-brand/20" : "border-border bg-card"
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-5 rounded-full bg-brand text-brand-foreground shadow-soft">
                  Most popular
                </Badge>
              )}
              <h4 className="font-display text-lg font-semibold">{plan.name}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{plan.blurb}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="font-display text-3xl font-semibold">${price}</span>
                <span className="mb-1 text-xs text-muted-foreground">/mo{cycle === "yearly" && plan.yearly > 0 ? " · billed annually" : ""}</span>
              </div>

              <div className="mt-4 min-h-[40px]">
                {isCurrent ? (
                  <Button variant="outline" className="w-full gap-2" disabled>
                    <Check className="h-4 w-4" /> Current plan
                  </Button>
                ) : plan.tier === "free" ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (isPaid) cancel.mutate();
                    }}
                    disabled={cancel.isPending || !isPaid}
                  >
                    {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isPaid ? "Downgrade to Free" : "Current plan"}
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => checkout.mutate(resolvePriceId(plan))}
                    disabled={checkout.isPending}
                  >
                    {checkout.isPending && checkout.variables === resolvePriceId(plan) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {isCurrent ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {isCurrent ? "Current plan" : `Switch to ${plan.name}`}
                  </Button>
                )}
              </div>

              <ul className="mt-5 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {/* Billing history */}
      <Card className="mt-5 p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display text-base font-semibold">Billing history</h3>
          </div>
          <Badge variant="outline" className="rounded-full gap-1 text-[10px]">
            <ShieldCheck className="h-3 w-3" /> {isPaid && !user.stripeSubId?.startsWith("sub_demo_") ? "Live" : "Demo mode"}
          </Badge>
        </div>
        {isPaid ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {HISTORY.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="pl-5 text-foreground/85">{new Date(row.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                  <TableCell className="text-foreground/85">{row.plan}</TableCell>
                  <TableCell className="font-mono text-xs">{row.amount}</TableCell>
                  <TableCell className="pr-5">
                    <Badge variant="secondary" className="gap-1 rounded-md text-[10px]">
                      <CheckCircle2 className="h-3 w-3 text-blue-500" /> {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No invoices yet. Upgrade to Pro or Scholar to start your billing history.
          </div>
        )}
        <p className="border-t border-border bg-muted/30 px-5 py-3 text-[11px] text-muted-foreground">
          {isPaid && user.stripeSubId?.startsWith("sub_demo_") ? (
            <span>Demo mode — no real charges. Connect Stripe to accept real payments.</span>
          ) : isPaid ? (
            <span>Powered by <strong>Stripe</strong>. Secure payments, PCI-compliant. Cancel anytime.</span>
          ) : (
            <span>Secure payments powered by Stripe. Cancel anytime.</span>
          )}
        </p>
      </Card>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function resolvePriceId(plan: PlanDef): string {
  return cycle === "yearly" && plan.yearly > 0
    ? `${plan.tier}_yearly` as string
    : `${plan.tier}_monthly` as string;
}

function StatusBadge({ status }: { status: string }) {
  const variant: any = status === "active" ? "default" : status === "trialing" ? "secondary" : status === "past_due" ? "destructive" : "outline";
  const label = status === "trialing" ? "Trial" : status === "past_due" ? "Past due" : status === "canceled" ? "Canceled" : "Active";
  return (
    <Badge variant={variant} className="rounded-full capitalize text-[10px]">
      {label}
    </Badge>
  );
}

function UsageMetric({
  icon: Icon, label, value, sub, pct,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  pct?: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-semibold">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        {typeof pct === "number" && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-to-r from-brand to-[var(--gold)] transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function fmtMin(m: number) {
  if (!m) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export { BillingPanel as default };
