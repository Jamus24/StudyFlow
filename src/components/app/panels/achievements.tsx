"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { PanelHeader, StatCard, LoadingBlock } from "../panel-utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Confetti } from "@/components/shared/confetti";
import { Trophy, Flame, Clock, CheckCircle2, BookOpen, Sparkles, StickyNote, Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeData {
  key: string; label: string; description: string; icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  goal: number; current: number; progress: number; unlocked: boolean; unlockedAt: string | null;
}
interface AchievementData {
  badges: BadgeData[];
  unlockedCount: number; totalBadges: number;
  tierCounts: { bronze: number; silver: number; gold: number; platinum: number };
  metrics: Record<string, number>;
  streak: number;
  newlyUnlocked: string[];
}

const TIER_STYLES = {
  bronze: { ring: "ring-amber-700/30", glow: "from-amber-700/20", label: "text-amber-700 dark:text-amber-500", chip: "bg-amber-700/10 text-amber-700 dark:text-amber-500 border-amber-700/20" },
  silver: { ring: "ring-slate-400/30", glow: "from-slate-400/20", label: "text-slate-500 dark:text-slate-300", chip: "bg-slate-400/10 text-slate-500 dark:text-slate-300 border-slate-400/20" },
  gold: { ring: "ring-amber-400/40", glow: "from-amber-400/25", label: "text-amber-600 dark:text-amber-400", chip: "bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-400/30" },
  platinum: { ring: "ring-cyan-400/40", glow: "from-cyan-400/25", label: "text-cyan-600 dark:text-cyan-400", chip: "bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 border-cyan-400/30" },
};

export { AchievementsPanel as default };

function AchievementsPanel() {
  const pushToast = useUI((s) => s.pushToast);
  const { data, isLoading } = useQuery<AchievementData>({
    queryKey: ["/api/achievements"],
    queryFn: () => api("/api/achievements"),
  });
  const [confettiKey, setConfettiKey] = useState(0);
  const toastedRef = useRef<Set<string>>(new Set());

  // toast + confetti for newly-unlocked badges (in effect, ref access OK here)
  useEffect(() => {
    if (!data?.newlyUnlocked?.length || !data.badges) return;
    const newKeys = data.newlyUnlocked.filter((k) => !toastedRef.current.has(k));
    if (!newKeys.length) return;
    for (const key of newKeys) {
      toastedRef.current.add(key);
      const badge = data.badges.find((b) => b.key === key);
      if (badge) {
        pushToast({ title: `🏆 ${badge.label} unlocked!`, description: badge.description, variant: "success" });
      }
    }
    // fire confetti via async setState (avoids synchronous setState-in-effect)
    queueMicrotask(() => setConfettiKey((k) => k + 1));
  }, [data?.newlyUnlocked, data?.badges, pushToast]);

  if (isLoading || !data) {
    return (
      <div>
        <PanelHeader title="Achievements" description="Badges and milestones you've earned" icon={Trophy} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <LoadingBlock key={i} className="h-28" />)}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <LoadingBlock key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  const pct = Math.round((data.unlockedCount / data.totalBadges) * 100);
  const unlocked = data.badges.filter((b) => b.unlocked);
  const locked = data.badges.filter((b) => !b.unlocked);
  // sort locked by progress desc (closest to unlocking first)
  locked.sort((a, b) => b.progress - a.progress);

  return (
    <div>
      <Confetti key={confettiKey} fire={confettiKey > 0} duration={3500} count={100} />
      <PanelHeader
        title="Achievements"
        description="Badges and milestones you've earned"
        icon={Trophy}
      />

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Badges unlocked" value={`${data.unlockedCount}/${data.totalBadges}`} sub={`${pct}% complete`} icon={Trophy} accent="#2563eb" />
        <StatCard label="Current streak" value={`${data.streak}d`} sub="consecutive days" icon={Flame} accent="#ef4444" />
        <StatCard label="Total minutes" value={fmtMin(data.metrics.minutes || 0)} sub="all time" icon={Clock} accent="#f59e0b" />
        <StatCard label="Tasks done" value={data.metrics.tasks || 0} sub="completed" icon={CheckCircle2} accent="#8b5cf6" />
      </div>

      {/* Overall progress */}
      <Card className="mt-4 overflow-hidden p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Collection progress</p>
            <p className="text-xs text-muted-foreground">{data.unlockedCount} of {data.totalBadges} badges unlocked</p>
          </div>
          <div className="flex gap-1.5">
            {(["bronze", "silver", "gold", "platinum"] as const).map((tier) => (
              <Badge key={tier} variant="outline" className={cn("rounded-full text-[10px] capitalize", TIER_STYLES[tier].chip)}>
                {data.tierCounts[tier]} {tier}
              </Badge>
            ))}
          </div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand to-[var(--gold)]"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </Card>

      {/* Recently unlocked (or closest) */}
      {unlocked.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-lg font-semibold">Earned</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {unlocked.map((badge, i) => (
              <BadgeCard key={badge.key} badge={badge} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* In progress */}
      {locked.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold">In progress</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {locked.map((badge, i) => (
              <BadgeCard key={badge.key} badge={badge} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BadgeCard({ badge, index }: { badge: BadgeData; index: number }) {
  const tier = TIER_STYLES[badge.tier];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 ring-1 transition-all",
        badge.unlocked ? cn("border-transparent ring-2", tier.ring, "card-hover") : "border-border opacity-75 hover:opacity-100"
      )}
    >
      {/* glow for unlocked */}
      {badge.unlocked && (
        <div className={cn("pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl", tier.glow)} />
      )}

      <div className="relative flex items-start justify-between">
        <div className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl text-3xl transition-transform duration-300 group-hover:scale-110",
          badge.unlocked ? "bg-gradient-to-br from-accent to-muted" : "bg-muted grayscale"
        )}>
          {badge.unlocked ? badge.icon : "🔒"}
        </div>
        <Badge variant="outline" className={cn("rounded-full text-[9px] uppercase tracking-wider capitalize", tier.chip)}>
          {badge.tier}
        </Badge>
      </div>

      <h3 className="mt-3 font-display text-sm font-semibold">{badge.label}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{badge.description}</p>

      {badge.unlocked ? (
        <p className="mt-3 text-[10px] font-medium text-blue-600 dark:text-blue-400">
          ✓ Unlocked {badge.unlockedAt ? new Date(badge.unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
        </p>
      ) : (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{fmtVal(badge.current)} / {fmtVal(badge.goal)}</span>
            <span className="font-medium text-foreground">{badge.progress}%</span>
          </div>
          <Progress value={badge.progress} className="h-1.5" />
        </div>
      )}
    </motion.div>
  );
}

function fmtMin(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
function fmtVal(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}
