"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { PanelHeader, StatCard, LoadingBlock } from "../panel-utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Users, Trophy, Crown, Medal, Clock, TrendingUp, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  planTier: string;
  minutes: number;
  isYou: boolean;
  rank: number;
}

interface LeaderData {
  leaderboard: LeaderEntry[];
  myRank: number;
  myMinutes: number;
  totalStudents: number;
  avgMinutes: number;
  weekMinutes: number;
}

export { LeaderboardPanel as default };

const RANK_STYLES = [
  { ring: "ring-amber-400/50", glow: "from-amber-400/20", icon: Crown, color: "#f59e0b", label: "Gold" },
  { ring: "ring-slate-400/50", glow: "from-slate-400/20", icon: Medal, color: "#94a3b8", label: "Silver" },
  { ring: "ring-amber-700/40", glow: "from-amber-700/15", icon: Medal, color: "#b45309", label: "Bronze" },
];

function LeaderboardPanel() {
  const { data, isLoading } = useQuery<LeaderData>({
    queryKey: ["/api/leaderboard"],
    queryFn: () => api("/api/leaderboard"),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div>
        <PanelHeader title="Leaderboard" description="See how you stack up this week" icon={Users} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <LoadingBlock key={i} className="h-28" />)}
        </div>
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <LoadingBlock key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  const lb = Array.isArray(data.leaderboard) ? data.leaderboard : [];
  const top3 = lb.slice(0, 3);
  const rest = lb.slice(3);
  const myEntry = lb.find((e) => e.isYou);

  return (
    <div>
      <PanelHeader
        title="Leaderboard"
        description="Weekly study minutes – ranks reset every Monday"
        icon={Users}
      />

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Your rank" value={`#${data.myRank}`} sub={`of ${data.totalStudents} students`} icon={Trophy} accent="#2563eb" />
        <StatCard label="Your minutes" value={fmtMin(data.myMinutes)} sub="this week" icon={Clock} accent="#f59e0b" />
        <StatCard label="Class average" value={fmtMin(data.avgMinutes)} sub="all students" icon={TrendingUp} accent="#8b5cf6" />
        <StatCard label="Students active" value={data.totalStudents} sub="studied this week" icon={Users} accent="#06b6d4" />
      </div>

      {/* Top 3 podium */}
      {top3.length >= 3 && (
        <Card className="relative mt-4 overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-40 w-[500px] -translate-x-1/2 bg-brand/10 blur-3xl rounded-full opacity-30" />
          </div>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Top performers</h3>
            <Badge variant="secondary" className="rounded-md text-[10px]">This week</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {/* 2nd place */}
            <PodiumCard entry={top3[1]} place={2} />
            {/* 1st place (taller) */}
            <PodiumCard entry={top3[0]} place={1} />
            {/* 3rd place */}
            <PodiumCard entry={top3[2]} place={3} />
          </div>
        </Card>
      )}

      {/* Full ranking */}
      <Card className="mt-4 p-5">
        <h3 className="mb-4 font-display text-sm font-semibold">Full ranking</h3>
        <div className="space-y-1.5">
          {rest.map((entry, i) => (
            <LeaderRow key={entry.userId} entry={entry} index={i} />
          ))}
          {/* If user is outside top 10, show them at the bottom */}
          {myEntry && myEntry.rank > 10 && (
            <>
              <div className="py-1 text-center text-xs text-muted-foreground">· · ·</div>
              <LeaderRow entry={myEntry} index={-1} />
            </>
          )}
          {!myEntry && data.myMinutes === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">You haven't studied this week yet.</p>
              <p className="text-xs text-muted-foreground/70">Log a session to appear on the leaderboard.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function PodiumCard({ entry, place }: { entry: LeaderEntry; place: 1 | 2 | 3 }) {
  const style = RANK_STYLES[place - 1];
  const Icon = style.icon;
  const heightClass = place === 1 ? "pt-2 sm:pt-4" : "pt-4 sm:pt-8";
  const avatarSize = place === 1 ? "h-16 w-16 sm:h-20 sm:w-20" : "h-12 w-12 sm:h-16 sm:w-16";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place * 0.08, duration: 0.4 }}
      className={cn("relative flex flex-col items-center", heightClass)}
    >
      {place === 1 && (
        <div className={cn("pointer-events-none absolute -top-2 h-24 w-24 rounded-full bg-gradient-to-b to-transparent blur-2xl", style.glow)} />
      )}
      <div className="relative">
        <Avatar className={cn(avatarSize, "ring-2", style.ring)}>
          <AvatarImage src={entry.avatarUrl || undefined} />
          <AvatarFallback className={cn("bg-accent font-display font-semibold", place === 1 ? "text-lg" : "text-sm")}>
            {entry.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className={cn("absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-card")} style={{ background: style.color }}>
          <Icon className="h-3 w-3 text-white" />
        </div>
      </div>
      <p className={cn("mt-2 truncate font-medium", entry.isYou && "text-brand", place === 1 && "font-semibold")}>
        {entry.isYou ? "You" : entry.name}
      </p>
      <p className="text-xs text-muted-foreground">{fmtMin(entry.minutes)}</p>
      <div className={cn("mt-2 h-12 w-full rounded-t-lg sm:h-16", place === 1 ? "h-16 sm:h-20" : "h-10 sm:h-12")} style={{ background: `linear-gradient(180deg, ${style.color}30, ${style.color}10)` }} />
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">#{place}</p>
    </motion.div>
  );
}

function LeaderRow({ entry, index }: { entry: LeaderEntry; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.max(0, index) * 0.03 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        entry.isYou ? "border-brand/30 bg-brand/5" : "border-border bg-card hover:bg-muted/40"
      )}
    >
      <span className={cn("w-8 shrink-0 text-center font-mono text-sm font-semibold tabular-nums", entry.rank <= 3 ? "text-brand" : "text-muted-foreground")}>
        {entry.rank}
      </span>
      <Avatar className="h-8 w-8">
        <AvatarImage src={entry.avatarUrl || undefined} />
        <AvatarFallback className="bg-accent text-xs font-semibold">{entry.name[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", entry.isYou && "text-brand")}>
          {entry.isYou ? "You" : entry.name}
        </p>
        <p className="text-[10px] text-muted-foreground capitalize">{entry.planTier} plan</p>
      </div>
      <div className="flex items-center gap-1.5">
        <Flame className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-sm tabular-nums text-foreground/90">{fmtMin(entry.minutes)}</span>
      </div>
    </motion.div>
  );
}

function fmtMin(m: number) {
  if (!m) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
