"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { PanelHeader, EmptyState, LoadingBlock } from "../panel-utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  GraduationCap, Calendar, AlertTriangle, Clock, CheckCircle2, Brain,
  Sparkles, ArrowRight, Target, Zap, Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamSubject {
  id: string;
  name: string;
  color: string;
  examDate: string;
  targetGrade: string | null;
  description: string | null;
  daysUntil: number;
  recentMinutes: number;
  tasksOpen: number;
  tasksDone: number;
  priority: "critical" | "high" | "medium" | "low";
}

interface PrepStrategy {
  topics: { name: string; priority: string; estHours: number; reason: string }[];
  tips: string[];
}

interface ExamPrepData {
  exams: ExamSubject[];
  prepStrategy: PrepStrategy | null;
  urgentCount: number;
  message?: string;
}

export { ExamPrepPanel as default };

const PRIORITY_STYLES = {
  critical: { color: "#ef4444", label: "Critical", bg: "bg-red-500/10", ring: "ring-red-500/30" },
  high: { color: "#f59e0b", label: "High", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
  medium: { color: "#2563eb", label: "Medium", bg: "bg-blue-500/10", ring: "ring-blue-500/30" },
  low: { color: "#94a3b8", label: "Low", bg: "bg-slate-500/10", ring: "ring-slate-500/30" },
};

function ExamPrepPanel() {
  const setAppRoute = useUI((s) => s.setAppRoute);
  const { data, isLoading } = useQuery<ExamPrepData>({
    queryKey: ["/api/exam-prep"],
    queryFn: () => api("/api/exam-prep"),
  });

  if (isLoading) {
    return (
      <div>
        <PanelHeader title="Exam Prep" description="Countdown and strategy for upcoming exams" icon={GraduationCap} />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <LoadingBlock key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.message || data.exams.length === 0) {
    return (
      <div>
        <PanelHeader title="Exam Prep" description="Countdown and strategy for upcoming exams" icon={GraduationCap} />
        <EmptyState
          icon={GraduationCap}
          title="No upcoming exams"
          description="Add exam dates to your subjects (within 30 days) and Study Flow will build a prioritized prep strategy."
          action={{ label: "Add exam dates", onClick: () => setAppRoute("subjects") }}
        />
      </div>
    );
  }

  const urgentExams = data.exams.filter((e) => e.priority === "critical" || e.priority === "high");

  return (
    <div>
      <PanelHeader
        title="Exam Prep"
        description={`${data.exams.length} exam${data.exams.length > 1 ? "s" : ""} in the next 30 days`}
        icon={GraduationCap}
        actions={
          urgentExams.length > 0 && (
            <Badge className="gap-1.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" /> {urgentExams.length} urgent
            </Badge>
          )
        }
      />

      {/* Exam countdown cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.exams.map((exam, i) => {
          const style = PRIORITY_STYLES[exam.priority];
          return (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <ExamCard exam={exam} style={style} onStudy={() => setAppRoute("focus")} />
            </motion.div>
          );
        })}
      </div>

      {/* AI Prep Strategy for most urgent exam */}
      {data.prepStrategy && (
        <Card className="relative mt-6 overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand/15 blur-2xl" />
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Brain className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold">AI prep strategy</h3>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                For {data.exams[0]?.name} · {data.exams[0]?.daysUntil} days out
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto rounded-md text-[9px]">AI</Badge>
          </div>

          {/* Topics */}
          {data.prepStrategy.topics?.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Priority topics</p>
              <div className="space-y-2">
                {data.prepStrategy.topics.map((t, idx) => {
                  const ts = PRIORITY_STYLES[t.priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.medium;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold" style={{ background: `${ts.color}1a`, color: ts.color }}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{t.name}</p>
                          <Badge variant="outline" className="rounded text-[9px] capitalize" style={{ color: ts.color, borderColor: `${ts.color}40` }}>
                            {t.priority}
                          </Badge>
                          <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" /> {t.estHours}h
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.reason}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tips */}
          {data.prepStrategy.tips?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Study tips</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.prepStrategy.tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 rounded-lg bg-accent/40 px-3 py-2">
                    <Zap className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
                    <span className="text-xs text-foreground/90">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* CTA */}
      <Card className="mt-4 flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="font-display text-sm font-semibold">Need a full study schedule?</p>
          <p className="text-xs text-muted-foreground">Generate an exam-sprint AI plan with day-by-day blocks.</p>
        </div>
        <Button className="gap-2" onClick={() => setAppRoute("plans")}>
          <Sparkles className="h-4 w-4" /> Generate plan
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Card>
    </div>
  );
}

function ExamCard({ exam, style, onStudy }: { exam: ExamSubject; style: typeof PRIORITY_STYLES[keyof typeof PRIORITY_STYLES]; onStudy: () => void }) {
  const examDate = new Date(exam.examDate);
  return (
    <Card className={cn("relative overflow-hidden p-5 ring-1 card-hover", style.ring)}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10 blur-2xl" style={{ background: exam.color }} />
      {/* color bar */}
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: exam.color }} />
      <div className="flex items-start justify-between pl-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: exam.color }}>
            <GraduationCap className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold leading-tight">{exam.name}</p>
            {exam.targetGrade && <p className="text-[10px] text-muted-foreground">Target: {exam.targetGrade}</p>}
          </div>
        </div>
        <Badge className={cn("rounded-md text-[9px]", style.bg)} style={{ color: style.color }}>
          {style.label}
        </Badge>
      </div>

      {/* Countdown */}
      <div className="mt-4 pl-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-semibold tabular-nums" style={{ color: style.color }}>
            {exam.daysUntil}
          </span>
          <span className="text-sm text-muted-foreground">{exam.daysUntil === 1 ? "day" : "days"} left</span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {examDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 pl-2">
        <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
          <p className="font-mono text-sm font-semibold tabular-nums">{exam.recentMinutes}m</p>
          <p className="text-[9px] text-muted-foreground">14d study</p>
        </div>
        <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
          <p className="font-mono text-sm font-semibold tabular-nums">{exam.tasksOpen}</p>
          <p className="text-[9px] text-muted-foreground">open tasks</p>
        </div>
        <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
          <p className="font-mono text-sm font-semibold tabular-nums">{exam.tasksDone}</p>
          <p className="text-[9px] text-muted-foreground">done</p>
        </div>
      </div>

      <Button size="sm" variant="outline" className="mt-4 w-full gap-1.5" onClick={onStudy}>
        <Flame className="h-3.5 w-3.5" /> Start studying
      </Button>
    </Card>
  );
}
