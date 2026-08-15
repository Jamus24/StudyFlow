"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/fetch";
import { useUI, useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PanelHeader, EmptyState } from "../panel-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Lightbulb,
  Clock3,
  Wand2,
  BookOpen,
  Brain,
  Trophy,
  ChevronRight,
  Target,
  CircleDot,
  AlarmClock,
  Zap,
} from "lucide-react";
import { LayersIcon } from "@/components/shared/icons";

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Horizon = "week" | "month" | "exam";
type BlockType = "study" | "review" | "practice" | "break" | "exam";

interface SubjectLite {
  id: string;
  name: string;
  color: string;
}

interface PlanBlock {
  time: string;
  durationMin: number;
  subject: string;
  activity: string;
  type: BlockType;
}

interface PlanDay {
  day: string;
  focus: string;
  blocks: PlanBlock[];
}

interface GeneratedPlan {
  title: string;
  summary: string;
  weeklyMinutes: number;
  principles: string[];
  days: PlanDay[];
  tips: string[];
}

interface Plan {
  id: string;
  title: string;
  goal: string;
  horizon: Horizon;
  startDate?: string | null;
  endDate?: string | null;
  promptSummary?: string | null;
  status?: string;
  createdAt: string;
  content: string;
}

const HORIZONS: {
  value: Horizon;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "week", label: "This week", hint: "7 days", Icon: CalendarRange },
  { value: "month", label: "This month", hint: "~30 days", Icon: Target },
  { value: "exam", label: "Exam sprint", hint: "Focused", Icon: AlarmClock },
];

const BLOCK_TYPE_META: Record<BlockType, { color: string; label: string }> = {
  study: { color: "#2563eb", label: "Study" },
  review: { color: "#8b5cf6", label: "Review" },
  practice: { color: "#06b6d4", label: "Practice" },
  break: { color: "#94a3b8", label: "Break" },
  exam: { color: "#ef4444", label: "Exam" },
};

const GENERATING_STEPS = [
  "Reading your syllabus…",
  "Scheduling blocks…",
  "Writing tips…",
  "Polishing the plan…",
];

function fmtRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "";
  const fmt = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt(start || end);
}

function parseContent(content: string): GeneratedPlan | null {
  try {
    const p = JSON.parse(content) as GeneratedPlan;
    if (!p || !p.days) return null;
    return p;
  } catch {
    return null;
  }
}

export function PlansPanel() {
  const qc = useQueryClient();
  const pushToast = useUI((s) => s.pushToast);
  const user = useAuthStore((s) => s.user);

  const [genOpen, setGenOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const plansQ = useQuery<{ plans: Plan[] }>({
    queryKey: ["/api/plans"],
    queryFn: () => api("/api/plans"),
  });
  const subjectsQ = useQuery<{ subjects: SubjectLite[] }>({
    queryKey: ["/api/subjects"],
    queryFn: () => api("/api/subjects"),
  });

  const plans = plansQ.data?.plans ?? [];
  const selected = selectedId
    ? plans.find((p) => p.id === selectedId) ?? null
    : null;

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/api/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/plans"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      pushToast({ title: "Plan deleted", variant: "success" });
      setDeletingId(null);
      if (selectedId && !plans.find((p) => p.id === selectedId)) {
        setSelectedId(null);
      }
    },
    onError: (e: Error) => {
      pushToast({
        title: "Couldn't delete plan",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div>
      <PanelHeader
        title="AI Study Plans"
        description="Turn your goals into a realistic schedule"
        icon={Sparkles}
        actions={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setGenOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Generate plan
          </Button>
        }
      />

      {plansQ.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <PlanListSkeleton />
          <div className="lg:col-span-2">
            <DetailSkeleton />
          </div>
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No plans yet"
          description="Generate your first AI plan in under a minute – Study Flow writes the schedule, principles, and tips."
          action={{
            label: "Generate plan",
            onClick: () => {
              setGenOpen(true);
            },
          }}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left: list */}
          <div className="lg:col-span-1">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Saved plans · {plans.length}
              </p>
            </div>
            <ScrollArea className="lg:max-h-[calc(100vh-220px)]">
              <div className="flex flex-col gap-2 pr-2.5">
                {plans.map((p) => (
                  <PlanListItem
                    key={p.id}
                    plan={p}
                    active={selectedId === p.id}
                    onClick={() => setSelectedId(p.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: detail or prompt */}
          <div className="lg:col-span-2">
            {selected ? (
              <PlanDetail
                plan={selected}
                onBack={() => setSelectedId(null)}
                onDelete={() => setDeletingId(selected.id)}
                deleting={deleteMut.isPending}
                subjects={subjectsQ.data?.subjects ?? []}
              />
            ) : (
              <EmptyDetail
                onGenerate={() => {
                  setGenOpen(true);
                }}
              />
            )}
          </div>
        </div>
      )}

      <GenerateDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        subjects={subjectsQ.data?.subjects ?? []}
        defaultLevel={user?.grade ?? ""}
        onGenerated={(_g, planId) => {
          setGenOpen(false);
          setSelectedId(planId);
        }}
      />

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              The plan and its generated schedule will be removed. Tasks you may
              have created from it stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deletingId && deleteMut.mutate(deletingId)}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Plan list item ---------- */

function PlanListItem({
  plan,
  active,
  onClick,
}: {
  plan: Plan;
  active: boolean;
  onClick: () => void;
}) {
  const horizon = HORIZONS.find((h) => h.value === plan.horizon);
  return (
    <button
      onClick={onClick}
      className={cn(
        "card-hover group flex w-full flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors",
        active && "border-brand/40 bg-brand/[0.04] ring-1 ring-brand/20"
      )}
      aria-pressed={active}
    >
      <div className="flex w-full items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            active ? "bg-brand/15 text-brand" : "bg-accent text-muted-foreground"
          )}
        >
          <Sparkles className="h-4 w-4" />
        </div>
        <h4 className="flex-1 truncate font-display text-sm font-semibold">
          {plan.title}
        </h4>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            active && "translate-x-0.5 text-brand"
          )}
        />
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{plan.goal}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {horizon && (
          <Badge variant="secondary" className="rounded-md text-[10px] gap-1">
            <horizon.Icon className="h-3 w-3" />
            {horizon.label}
          </Badge>
        )}
        {(plan.startDate || plan.endDate) && (
          <span className="text-[11px] text-muted-foreground">
            {fmtRange(plan.startDate, plan.endDate)}
          </span>
        )}
      </div>
    </button>
  );
}

/* ---------- Empty detail ---------- */

function EmptyDetail({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Wand2 className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        Pick a plan or generate a new one
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Select a saved plan on the left to see its schedule, principles, and
        tips. Or start fresh and let Study Flow draft a study week for you.
      </p>
      <Button className="mt-5 gap-2" onClick={onGenerate}>
        <Sparkles className="h-4 w-4" /> Generate plan
      </Button>
    </div>
  );
}

/* ---------- Plan detail ---------- */

function PlanDetail({
  plan,
  onBack,
  onDelete,
  deleting,
  subjects,
}: {
  plan: Plan;
  onBack: () => void;
  onDelete: () => void;
  deleting: boolean;
  subjects: SubjectLite[];
}) {
  const qc = useQueryClient();
  const pushToast = useUI((s) => s.pushToast);
  const parsed = useMemo(() => parseContent(plan.content), [plan.content]);
  const horizon = HORIZONS.find((h) => h.value === plan.horizon);

  // Build a lookup from subject name → subject id
  const subjectNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subjects) {
      m.set(s.name.toLowerCase(), s.id);
    }
    return m;
  }, [subjects]);

  const applyMut = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("Plan content could not be read.");
      const blocks: { title: string; subjectId?: string | null; type: string; estMinutes: number; description: string; scheduledFor?: string }[] = [];
      const startDate = plan.startDate ? new Date(plan.startDate) : new Date();

      for (let di = 0; di < parsed.days.length; di++) {
        const day = parsed.days[di];
        if (!day.blocks?.length) continue;
        // Try to figure out the date for this day.
        // The plan starts on startDate; day 0 = startDate, day 1 = startDate+1, etc.
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + di);
        const dateStr = dayDate.toISOString().slice(0, 10);

        for (const b of day.blocks) {
          if (b.type === "break") continue;
          const subjectId = subjectNameMap.get(b.subject.toLowerCase()) ?? null;
          blocks.push({
            title: `[${day.day}] ${b.subject}: ${b.activity}`,
            subjectId,
            type: b.type === "exam" ? "exam" : b.type === "practice" ? "practice" : b.type === "review" ? "review" : "study",
            estMinutes: b.durationMin,
            description: `From plan: ${plan.title}\nDay: ${day.day} – ${day.focus}\nTime: ${b.time} (${b.durationMin} min)`,
            scheduledFor: dateStr,
          });
        }
      }

      if (blocks.length === 0) throw new Error("No task-able blocks found in this plan.");

      // Create tasks sequentially so we don't overwhelm the server
      const results: unknown[] = [];
      for (const t of blocks) {
        const res = await api("/api/tasks", { method: "POST", json: t });
        results.push(res);
      }
      return results;
    },
    onSuccess: (results) => {
      const count = (results as unknown[]).length;
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      pushToast({
        title: `${count} task${count !== 1 ? "s" : ""} created`,
        description: "Switch to the Tasks tab to see them.",
        variant: "success",
      });
    },
    onError: (e: Error) => {
      pushToast({
        title: "Couldn't create tasks",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  return (
    <motion.div
      key={plan.id}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
      className="rounded-2xl border border-border bg-card shadow-soft"
    >
      {/* header */}
      <div className="border-b border-border p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="ring-focus mt-0.5 hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:block"
            aria-label="Back to list"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {horizon && (
                <Badge
                  variant="secondary"
                  className="rounded-md text-[10px] gap-1"
                >
                  <horizon.Icon className="h-3 w-3" />
                  {horizon.label}
                </Badge>
              )}
              {(plan.startDate || plan.endDate) && (
                <span className="text-[11px] text-muted-foreground">
                  {fmtRange(plan.startDate, plan.endDate)}
                </span>
              )}
            </div>
            <h2 className="mt-1.5 font-display text-xl font-semibold leading-tight">
              {plan.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Goal: <span className="text-foreground/80">{plan.goal}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => applyMut.mutate()} disabled={applyMut.isPending || !parsed}>
            {applyMut.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating tasks…
              </>
            ) : (
              <><Plus className="h-4 w-4" /> Apply as tasks</>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
          {parsed && (
            <Badge
              variant="secondary"
              className="ml-auto rounded-md text-[11px] gap-1"
            >
              <Clock3 className="h-3 w-3" />
              {Math.round(parsed.weeklyMinutes / 60)}h / week
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="lg:max-h-[calc(100vh-280px)]">
        <div className="space-y-6 p-5 sm:p-6">
          {parsed ? (
            <>
              {/* Summary */}
              <section>
                <SectionTitle icon={Brain}>Summary</SectionTitle>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                  {parsed.summary}
                </p>
              </section>

              {/* Principles */}
              {parsed.principles?.length > 0 && (
                <section>
                  <SectionTitle icon={CheckCircle2}>Principles</SectionTitle>
                  <ul className="mt-3 space-y-2">
                    {parsed.principles.map((p, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-sm text-foreground/85">{p}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Weekly schedule */}
              <section>
                <SectionTitle icon={CalendarRange}>
                  Weekly schedule
                </SectionTitle>
                <div className="mt-3 space-y-3">
                  {parsed.days.map((d, i) => (
                    <DayBlock key={i} day={d} />
                  ))}
                </div>
              </section>

              {/* Tips */}
              {parsed.tips?.length > 0 && (
                <section>
                  <SectionTitle icon={Lightbulb}>Tips</SectionTitle>
                  <ol className="mt-3 space-y-2.5">
                    {parsed.tips.map((t, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                          {i + 1}
                        </span>
                        <span className="pt-0.5 text-sm text-foreground/85">
                          {t}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              This plan's content couldn't be read. Try regenerating it.
            </p>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-brand" />
      <h3 className="font-display text-sm font-semibold">{children}</h3>
    </div>
  );
}

function DayBlock({ day }: { day: PlanDay }) {
  if (!day.blocks?.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold">
            {day.day}
          </span>
          <span className="text-xs text-muted-foreground">{day.focus}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground/70">Rest day – no scheduled blocks.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-sm font-semibold">{day.day}</span>
        <span className="text-xs text-muted-foreground">{day.focus}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {day.blocks.length} {day.blocks.length === 1 ? "block" : "blocks"}
        </span>
      </div>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {day.blocks.map((b, i) => {
          const meta = BLOCK_TYPE_META[b.type] ?? BLOCK_TYPE_META.study;
          return (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5 text-xs"
            >
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                {b.time}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {b.durationMin}m
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                style={{ background: `${meta.color}1a`, color: meta.color }}
              >
                {b.subject}
              </span>
              <span className="flex-1 min-w-[120px] truncate text-foreground/80">
                {b.activity}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                style={{ background: `${meta.color}1a`, color: meta.color }}
              >
                <CircleDot className="h-2.5 w-2.5" />
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Generate dialog ---------- */

function GenerateDialog({
  open,
  onOpenChange,
  subjects,
  defaultLevel,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subjects: SubjectLite[];
  defaultLevel: string;
  onGenerated: (g: GeneratedPlan, planId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            Generate a study plan
          </DialogTitle>
          <DialogDescription>
            Tell Study Flow what you're aiming for. The plan is saved to your
            library so you can come back to it.
          </DialogDescription>
        </DialogHeader>
        <GenerateForm
          subjects={subjects}
          defaultLevel={defaultLevel}
          onCancel={() => onOpenChange(false)}
          onGenerated={onGenerated}
        />
      </DialogContent>
    </Dialog>
  );
}

function GenerateForm({
  subjects,
  defaultLevel,
  onCancel,
  onGenerated,
}: {
  subjects: SubjectLite[];
  defaultLevel: string;
  onCancel: () => void;
  onGenerated: (g: GeneratedPlan, planId: string) => void;
}) {
  const qc = useQueryClient();
  const pushToast = useUI((s) => s.pushToast);

  const [goal, setGoal] = useState("");
  const [horizon, setHorizon] = useState<Horizon>("week");
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(5);
  const [level, setLevel] = useState<string>(defaultLevel);
  const [weaknesses, setWeaknesses] = useState<string>("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() =>
    subjects.map((s) => s.id)
  );
  const [stepIdx, setStepIdx] = useState(0);

  const genMut = useMutation({
    mutationFn: () =>
      api<{ plan: Plan; generated: GeneratedPlan }>("/api/plans", {
        method: "POST",
        json: {
          goal,
          horizon,
          hoursPerWeek,
          level: level.trim() || undefined,
          weaknesses: weaknesses.trim() || undefined,
          subjectIds: selectedSubjects.length ? selectedSubjects : undefined,
        },
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/plans"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      pushToast({
        title: "Plan ready",
        description: data.generated?.title || "Study Flow drafted a new schedule.",
        variant: "success",
      });
      onGenerated(data.generated, data.plan.id);
    },
    onError: (e: Error) => {
      pushToast({
        title: "Couldn't generate plan",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const generating = genMut.isPending;

  // Cycle the loading step text while generating.
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => {
      setStepIdx((i) => (i + 1) % GENERATING_STEPS.length);
    }, 1300);
    return () => clearInterval(t);
  }, [generating]);

  function toggleSubject(id: string) {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (generating) {
    return <GeneratingState stepIdx={stepIdx} />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="plan-goal">
          What do you want to achieve this period?
        </Label>
        <Textarea
          id="plan-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Catch up on calculus and revise organic chem before midterms"
          rows={3}
        />
        <p className="text-[11px] text-muted-foreground">
          Be specific – topics, dates, or grades you're aiming for help Study Flow
          draft a sharper plan.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Horizon</Label>
        <div className="grid grid-cols-3 gap-2">
          {HORIZONS.map((h) => {
            const active = horizon === h.value;
            return (
              <button
                key={h.value}
                type="button"
                onClick={() => setHorizon(h.value)}
                className={cn(
                  "ring-focus flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-center transition-colors",
                  active
                    ? "border-brand/40 bg-brand/[0.06] text-foreground"
                    : "border-border bg-card hover:bg-accent/40"
                )}
                aria-pressed={active}
              >
                <h.Icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-brand" : "text-muted-foreground"
                  )}
                />
                <span className="text-xs font-medium">{h.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {h.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="plan-hours">Study hours per week</Label>
          <span className="font-mono text-sm font-semibold text-brand">
            {hoursPerWeek}h
          </span>
        </div>
        <Slider
          id="plan-hours"
          value={[hoursPerWeek]}
          min={1}
          max={20}
          step={1}
          onValueChange={(v) => setHoursPerWeek(v[0])}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1h</span>
          <span>10h</span>
          <span>20h</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="plan-level">Your level</Label>
          <Input
            id="plan-level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="e.g. Grade 11"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Subjects to include</Label>
          <div className="flex h-9 min-h-9 flex-wrap items-center gap-1.5 overflow-y-auto rounded-md border border-border bg-card px-2 py-1">
            {selectedSubjects.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                None selected
              </span>
            ) : subjects.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                No subjects yet
              </span>
            ) : (
              subjects
                .filter((s) => selectedSubjects.includes(s.id))
                .map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      background: `${s.color}1a`,
                      color: s.color,
                    }}
                  >
                    {s.name}
                  </span>
                ))
            )}
          </div>
        </div>
      </div>

      {subjects.length > 0 && (
        <div className="space-y-1.5">
          <Label>Pick subjects</Label>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {subjects.map((s) => {
              const checked = selectedSubjects.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                    checked
                      ? "border-brand/30 bg-brand/[0.04]"
                      : "border-border bg-card hover:bg-accent/40"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSubject(s.id)}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="flex-1 truncate">{s.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="plan-weak">
          Weak spots <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="plan-weak"
          value={weaknesses}
          onChange={(e) => setWeaknesses(e.target.value)}
          placeholder="Topics you find hardest – Study Flow will weight them more heavily"
          rows={2}
        />
      </div>

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={generating}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => genMut.mutate()}
          disabled={generating || goal.trim().length < 4}
          className="gap-2"
        >
          <Wand2 className="h-4 w-4" />
          Generate plan
        </Button>
      </DialogFooter>
    </div>
  );
}

function GeneratingState({ stepIdx }: { stepIdx: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse-ring rounded-full" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Sparkles className="h-7 w-7 animate-pulse" />
        </div>
      </div>
      <h3 className="mt-5 font-display text-base font-semibold">
        Drafting your plan
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        This usually takes 5–10 seconds.
      </p>
      <div className="mt-4 flex h-5 items-center gap-2 text-sm text-foreground/80">
        <Zap className="h-3.5 w-3.5 text-brand" />
        <AnimatePresence mode="wait">
          <motion.span
            key={stepIdx}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {GENERATING_STEPS[stepIdx]}
          </motion.span>
        </AnimatePresence>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
        {[
          { Icon: BookOpen, label: "Syllabus" },
          { Icon: LayersIcon, label: "Schedule" },
          { Icon: Brain, label: "Principles" },
          { Icon: Trophy, label: "Tips" },
        ].map((s, i) => (
          <li
            key={i}
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5",
              i <= stepIdx && "border-brand/30 bg-brand/[0.04] text-foreground"
            )}
          >
            <s.Icon className={cn("h-3 w-3", i <= stepIdx ? "text-brand" : "")} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Skeletons ---------- */

function PlanListSkeleton() {
  return (
    <div className="lg:col-span-1">
      <div className="mb-2 h-3 w-32 rounded bg-muted/60" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer relative h-20 overflow-hidden rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="skeleton-shimmer relative h-[480px] overflow-hidden rounded-2xl border border-border bg-card">
      <div className="absolute inset-0 bg-muted/30" />
    </div>
  );
}

export { PlansPanel as default };
