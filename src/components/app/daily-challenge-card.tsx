"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Check, Flame, Gift, Clock, Brain, ArrowRight } from "lucide-react";
import { LayersIcon } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  type: string;
  target: number;
  progress: number;
  completed: boolean;
  points: number;
  label: string;
  icon: string;
}

interface ChallengeData {
  challenge: Challenge;
  challengeStreak: number;
  totalCompleted: number;
}

const ICON_MAP: Record<string, any> = {
  clock: Clock,
  check: Check,
  layers: LayersIcon,
  brain: Brain,
};

export function DailyChallengeCard() {
  const { setAppRoute } = useUI();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<ChallengeData>({
    queryKey: ["/api/daily-challenge"],
    queryFn: () => api("/api/daily-challenge"),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <Card className="relative overflow-hidden p-5">
        <div className="relative h-24 overflow-hidden rounded-lg bg-muted/30">
          <div className="skeleton-shimmer absolute inset-0" />
        </div>
      </Card>
    );
  }

  const c = data.challenge;
  const Icon = ICON_MAP[c.icon] || Target;
  const pct = Math.min(100, Math.round((c.progress / c.target) * 100));

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold">Daily challenge</h3>
            <p className="text-[10px] text-muted-foreground">Resets at midnight</p>
          </div>
        </div>
        {data.challengeStreak > 0 && (
          <Badge variant="outline" className="rounded-md text-[9px] gap-1">
            <Flame className="h-2.5 w-2.5 text-amber-500" /> {data.challengeStreak}d streak
          </Badge>
        )}
      </div>

      <AnimatePresence mode="wait">
        {c.completed ? (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-4 flex flex-col items-center py-4 text-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/15 text-blue-500"
            >
              <Check className="h-7 w-7" />
            </motion.div>
            <p className="mt-3 font-display text-sm font-semibold">Challenge complete!</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              +{c.points} bonus points earned
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
              <Gift className="h-3 w-3" /> Come back tomorrow for a new challenge
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <p className="flex-1 text-sm font-medium">{c.label}</p>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[var(--gold)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {c.progress}/{c.target}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                <Gift className="h-3 w-3" /> +{c.points} points
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() => {
                  if (c.type === "study_minutes") setAppRoute("focus");
                  else if (c.type === "complete_tasks") setAppRoute("tasks");
                  else if (c.type === "review_cards") setAppRoute("flashcards");
                  else if (c.type === "quiz_score") setAppRoute("quiz");
                }}
              >
                Go <ArrowRight className="h-2.5 w-2.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {data.totalCompleted > 0 && (
        <p className="mt-3 border-t border-border pt-2 text-center text-[10px] text-muted-foreground">
          {data.totalCompleted} challenge{data.totalCompleted > 1 ? "s" : ""} completed all-time
        </p>
      )}
    </Card>
  );
}
