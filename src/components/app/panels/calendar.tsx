"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarRange, CalendarDays, ChevronLeft, ChevronRight,
  Clock, CheckSquare, Sparkles, Plus,
} from "lucide-react";
import { useDashboard } from "@/lib/hooks";
import { useUI } from "@/lib/store";
import { PanelHeader, EmptyState, LoadingBlock } from "../panel-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ViewMode = "month" | "week";

interface TaskItem {
  id: string;
  title: string;
  subjectId?: string | null;
  subject?: { id: string; name: string; color: string } | null;
  dueDate?: string | null;
  scheduledFor?: string | null;
  status?: string;
  priority?: string;
  estMinutes?: number;
}
interface SessionItem {
  id: string;
  startedAt: string;
  durationMin: number;
  focusScore?: number | null;
  subject?: { name: string; color: string } | null;
  mode?: string;
}

const reduce =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CalendarPanel() {
  const { data, isLoading } = useDashboard();
  const setAppRoute = useUI((s) => s.setAppRoute);
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const tasks = (data?.tasks ?? []) as TaskItem[];
  const sessions = (data?.sessions7d ?? []) as SessionItem[];
  const subjects = data?.subjects ?? [];

  // Bucket tasks by day (using dueDate primarily; fall back to scheduledFor)
  const taskByDay = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      const iso = t.dueDate ?? t.scheduledFor;
      if (!iso) continue;
      const key = new Date(iso).toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const sessionByDay = useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    for (const s of sessions) {
      const key = new Date(s.startedAt).toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [sessions]);

  const hasDatedItems = taskByDay.size > 0 || sessionByDay.size > 0;

  if (isLoading) {
    return (
      <div>
        <PanelHeader
          title="Calendar"
          description="Your study schedule at a glance"
          icon={CalendarRange}
          actions={
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)} variant="outline" size="sm">
              <ToggleGroupItem value="month" aria-label="Month view">Month</ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Week view">Week</ToggleGroupItem>
            </ToggleGroup>
          }
        />
        <LoadingBlock className="h-[520px] p-0" />
      </div>
    );
  }

  if (!hasDatedItems && tasks.length === 0 && sessions.length === 0) {
    return (
      <div>
        <PanelHeader title="Calendar" description="Your study schedule at a glance" icon={CalendarRange} />
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled"
          description="Add due dates to tasks to see them on your calendar. Sessions you log will appear here too."
          action={{ label: "Add a task", onClick: () => setAppRoute("tasks") }}
        />
      </div>
    );
  }

  return (
    <div>
      <PanelHeader
        title="Calendar"
        description="Your study schedule at a glance"
        icon={CalendarRange}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAppRoute("tasks")}>
              <Plus className="h-4 w-4" /> Task
            </Button>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as ViewMode)}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="month" aria-label="Month view">Month</ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Week view">Week</ToggleGroupItem>
            </ToggleGroup>
          </>
        }
      />

      {view === "month" ? (
        <MonthView
          cursor={cursor}
          taskByDay={taskByDay}
          sessionByDay={sessionByDay}
          onPrev={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          onToday={() => setCursor(new Date())}
          onSelectDay={setSelectedDay}
        />
      ) : (
        <WeekView
          cursor={cursor}
          taskByDay={taskByDay}
          sessionByDay={sessionByDay}
          onPrev={() => shiftDays(cursor, -7, setCursor)}
          onNext={() => shiftDays(cursor, 7, setCursor)}
          onToday={() => setCursor(new Date())}
          onSelectDay={setSelectedDay}
        />
      )}

      <DaySheet
        day={selectedDay}
        tasks={selectedDay ? taskByDay.get(selectedDay.toISOString().slice(0, 10)) ?? [] : []}
        sessions={selectedDay ? sessionByDay.get(selectedDay.toISOString().slice(0, 10)) ?? [] : []}
        onClose={() => setSelectedDay(null)}
        onOpenTasks={() => { setSelectedDay(null); setAppRoute("tasks"); }}
      />

      <SubjectLegend subjects={subjects} />
    </div>
  );
}

/* ---------------- Month View ---------------- */

function MonthView({
  cursor, taskByDay, sessionByDay, onPrev, onNext, onToday, onSelectDay,
}: {
  cursor: Date;
  taskByDay: Map<string, TaskItem[]>;
  sessionByDay: Map<string, SessionItem[]>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectDay: (d: Date) => void;
}) {
  const cells = useMemo(() => buildMonthCells(cursor), [cursor]);
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <Card className="overflow-hidden p-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-display text-base font-semibold sm:text-lg">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={onToday}>Today</Button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center">
        {DOW.map((d) => (
          <div key={d} className="px-1 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-px bg-border/40">
        {cells.map((cell, i) => {
          const key = cell.date.toISOString().slice(0, 10);
          const dayTasks = taskByDay.get(key) ?? [];
          const daySessions = sessionByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isOther = !cell.inMonth;
          const hasItems = dayTasks.length > 0 || daySessions.length > 0;
          return (
            <motion.button
              key={key + i}
              type="button"
              onClick={() => onSelectDay(cell.date)}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, delay: reduce ? 0 : Math.min(i * 0.005, 0.12) }}
              whileHover={reduce ? undefined : { y: -1 }}
              className={cn(
                "group relative flex min-h-[84px] flex-col gap-1 p-1.5 text-left transition-colors sm:min-h-[110px] sm:p-2",
                "bg-card hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none",
                isOther && "bg-muted/20 opacity-60",
              )}
              aria-label={`${cell.date.toDateString()}${dayTasks.length ? `, ${dayTasks.length} tasks` : ""}${daySessions.length ? `, ${daySessions.length} sessions` : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday
                      ? "bg-brand text-brand-foreground shadow-soft"
                      : "text-foreground/80"
                  )}
                >
                  {cell.date.getDate()}
                </span>
                {daySessions.length > 0 && (
                  <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[9px] font-mono">
                    {daySessions.length}·s
                  </Badge>
                )}
              </div>

              {/* Task chips */}
              <div className="flex flex-col gap-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1 rounded-md bg-accent/60 px-1.5 py-0.5 text-[10px] leading-tight"
                    title={t.title}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: t.subject?.color || "#94a3b8" }}
                    />
                    <span className="truncate text-foreground/85">{t.title}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>

              {/* Sessions indicator */}
              {daySessions.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-0.5">
                  {daySessions.slice(0, 6).map((s, idx) => (
                    <span
                      key={s.id + idx}
                      className="h-1 w-1 rounded-full"
                      style={{ background: s.subject?.color || "var(--brand)" }}
                    />
                  ))}
                </div>
              )}

              {!hasItems && !isOther && (
                <span className="mt-auto hidden text-[10px] text-muted-foreground/40 group-hover:block">
                  +
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------------- Week View ---------------- */

function WeekView({
  cursor, taskByDay, sessionByDay, onPrev, onNext, onToday, onSelectDay,
}: {
  cursor: Date;
  taskByDay: Map<string, TaskItem[]>;
  sessionByDay: Map<string, SessionItem[]>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectDay: (d: Date) => void;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [cursor]);

  const label = `${days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-display text-base font-semibold sm:text-lg">{label}</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={onToday}>Today</Button>
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const dayTasks = taskByDay.get(key) ?? [];
          const daySessions = sessionByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const totalMin = daySessions.reduce((s, x) => s + x.durationMin, 0);
          return (
            <motion.div
              key={key}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex min-h-[180px] flex-col rounded-xl border p-3 transition-colors",
                isToday ? "border-brand/40 bg-accent/30" : "border-border bg-card hover:border-foreground/15"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{DOW[d.getDay()]}</p>
                  <p className={cn("font-display text-lg font-semibold", isToday && "text-brand")}>{d.getDate()}</p>
                </div>
                {totalMin > 0 && (
                  <Badge variant="secondary" className="rounded-md text-[10px] font-mono">
                    {fmtMin(totalMin)}
                  </Badge>
                )}
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {daySessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start gap-1.5 rounded-md bg-muted/60 px-2 py-1.5 text-[11px]"
                  >
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: s.subject?.color || "var(--brand)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground/90">{s.subject?.name ?? "General"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {fmtMin(s.durationMin)} · {timeLabel(s.startedAt)}
                      </p>
                    </div>
                  </div>
                ))}

                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-[11px]"
                  >
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: t.subject?.color || "#94a3b8" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground/85">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.dueDate ? "Due" : "Scheduled"}{t.estMinutes ? ` · ${t.estMinutes}m` : ""}
                      </p>
                    </div>
                  </div>
                ))}

                {dayTasks.length === 0 && daySessions.length === 0 && (
                  <p className="px-1 py-2 text-[11px] text-muted-foreground/60">Free day.</p>
                )}
              </div>

              <button
                onClick={() => onSelectDay(d)}
                className="mt-2 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Details →
              </button>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------------- Day Sheet ---------------- */

function DaySheet({
  day, tasks, sessions, onClose, onOpenTasks,
}: {
  day: Date | null;
  tasks: TaskItem[];
  sessions: SessionItem[];
  onClose: () => void;
  onOpenTasks: () => void;
}) {
  const open = !!day;
  const totalMin = sessions.reduce((s, x) => s + x.durationMin, 0);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">
            {day?.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </SheetTitle>
          <SheetDescription>
            {tasks.length} task{tasks.length === 1 ? "" : "s"} · {sessions.length} session{sessions.length === 1 ? "" : "s"}
            {totalMin > 0 && ` · ${fmtMin(totalMin)} studied`}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5">
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CheckSquare className="h-3.5 w-3.5" /> Tasks
              </h3>
              {tasks.length ? (
                <div className="space-y-1.5">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-2.5"
                    >
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: t.subject?.color || "#94a3b8" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{t.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {t.subject?.name ?? "No subject"}
                          {t.priority ? ` · ${t.priority}` : ""}
                          {t.estMinutes ? ` · ${t.estMinutes}m` : ""}
                        </p>
                      </div>
                      {t.status === "done" && (
                        <Badge variant="secondary" className="rounded-md text-[10px]">Done</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-card px-3 py-4 text-center text-xs text-muted-foreground">
                  No tasks scheduled for this day.
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Sessions
              </h3>
              {sessions.length ? (
                <div className="space-y-1.5">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-2.5"
                    >
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: s.subject?.color || "var(--brand)" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">
                          {s.subject?.name ?? "General"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {fmtMin(s.durationMin)} · started {timeLabel(s.startedAt)}
                          {s.focusScore ? ` · focus ${s.focusScore}` : ""}
                        </p>
                      </div>
                      {s.mode && (
                        <Badge variant="outline" className="rounded-md text-[10px] capitalize">{s.mode}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-card px-3 py-4 text-center text-xs text-muted-foreground">
                  No sessions logged yet.
                </p>
              )}
            </section>

            <Button variant="outline" className="w-full gap-2" onClick={onOpenTasks}>
              <Sparkles className="h-4 w-4" /> Manage tasks
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/* ---------------- Subject legend ---------------- */

function SubjectLegend({ subjects }: { subjects: any[] }) {
  if (!subjects?.length) return null;
  return (
    <Card className="mt-4 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subjects</p>
        <span className="text-[10px] text-muted-foreground">{subjects.length} active</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {subjects.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-foreground/80">{s.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Helpers ---------------- */

function buildMonthCells(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startDow = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - startDow);
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, inMonth: d.getMonth() === cursor.getMonth() };
  });
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const dow = x.getDay();
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function shiftDays(d: Date, n: number, setter: (d: Date) => void) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  setter(x);
}

function fmtMin(m: number) {
  if (!m) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export { CalendarPanel as default };
