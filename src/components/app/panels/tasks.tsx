"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PanelHeader, EmptyState, SkeletonGrid } from "../panel-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckSquare,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  Clock3,
  Circle,
  ListTodo,
  ChevronUp,
  ChevronDown,
  Minus,
  ArrowLeftRight,
  CalendarDays,
  Timer,
  Inbox,
} from "lucide-react";

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Priority = "low" | "medium" | "high";
type Status = "todo" | "doing" | "done";
type TaskType = "study" | "review" | "practice" | "exam" | "project";

interface SubjectLite {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: Status;
  priority: Priority;
  type: TaskType;
  estMinutes: number;
  dueDate?: string | null;
  scheduledFor?: string | null;
  tags?: string;
  subject?: { id: string; name: string; color: string } | null;
}

const PRIORITY_DOT: Record<Priority, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#94a3b8",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const TYPE_LABEL: Record<TaskType, string> = {
  study: "Study",
  review: "Review",
  practice: "Practice",
  exam: "Exam",
  project: "Project",
};

const TYPE_COLOR: Record<TaskType, string> = {
  study: "#2563eb",
  review: "#8b5cf6",
  practice: "#06b6d4",
  exam: "#ef4444",
  project: "#f59e0b",
};

const COLUMNS: { id: Status; title: string; hint: string; accent: string }[] = [
  { id: "todo", title: "To do", hint: "Queued up", accent: "#94a3b8" },
  { id: "doing", title: "Doing", hint: "In progress", accent: "#f59e0b" },
  { id: "done", title: "Done", hint: "Shipped", accent: "#2563eb" },
];

function dueLabel(iso?: string | null):
  | { label: string; overdue: boolean }
  | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round(
    (startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 864e5
  );
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { label: "today", overdue: false };
  if (days === 1) return { label: "tomorrow", overdue: false };
  return { label: `in ${days}d`, overdue: false };
}

function fmtDateInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function buildQuery(filters: {
  q: string;
  subjectId: string;
  priority: string;
  status: string;
}) {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.subjectId) p.set("subjectId", filters.subjectId);
  if (filters.priority) p.set("priority", filters.priority);
  if (filters.status) p.set("status", filters.status);
  const qs = p.toString();
  return qs ? `/api/tasks?${qs}` : "/api/tasks";
}

export function TasksPanel() {
  const qc = useQueryClient();
  const pushToast = useUI((s) => s.pushToast);

  const [view, setView] = useState<"board" | "list">("board");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Keyboard "n" opens the new-task dialog when not focused on a text input.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable ||
        el.getAttribute("role") === "combobox" ||
        el.getAttribute("role") === "textbox"
      ) {
        return;
      }
      e.preventDefault();
      setEditing(null);
      setDialogOpen(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const queryKey = buildQuery({
    q: debouncedQ,
    subjectId,
    priority,
    status,
  });

  const { data, isLoading } = useQuery<{ tasks: Task[] }>({
    queryKey: [queryKey],
    queryFn: () => api(queryKey),
  });

  const subjectsQ = useQuery<{ subjects: SubjectLite[] }>({
    queryKey: ["/api/subjects"],
    queryFn: () => api("/api/subjects"),
  });

  const tasks = data?.tasks ?? [];
  const groups = useMemo(
    () => ({
      todo: tasks.filter((t) => t.status === "todo"),
      doing: tasks.filter((t) => t.status === "doing"),
      done: tasks.filter((t) => t.status === "done"),
    }),
    [tasks]
  );

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(task: Task) {
    setEditing(task);
    setDialogOpen(true);
  }

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Task> }) =>
      api(`/api/tasks/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (e: Error) => {
      pushToast({
        title: "Couldn't update task",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  function setStatusFor(task: Task, newStatus: Status) {
    patchMut.mutate({ id: task.id, body: { status: newStatus } });
    pushToast({
      title:
        newStatus === "done"
          ? "Marked done"
          : newStatus === "doing"
            ? "Moved to Doing"
            : "Moved to To do",
      description: task.title,
      variant: "success",
    });
  }

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      pushToast({ title: "Task deleted", variant: "success" });
      setDeletingId(null);
    },
    onError: (e: Error) => {
      pushToast({
        title: "Couldn't delete task",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const activeFilters = !!(debouncedQ || subjectId || priority || status);

  return (
    <div>
      <PanelHeader
        title="Tasks"
        description="Everything you need to work through"
        icon={CheckSquare}
        actions={
          <>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as "board" | "list")}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="board" aria-label="Board view">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Board</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <ListIcon className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </ToggleGroupItem>
            </ToggleGroup>
            <Button size="sm" className="gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" /> New task
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
            className="pl-9"
            aria-label="Search tasks"
          />
        </div>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by subject">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjectsQ.data?.subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[140px]" aria-label="Filter by priority">
            <SelectValue placeholder="Any priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]" aria-label="Filter by status">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="todo">To do</SelectItem>
            <SelectItem value="doing">Doing</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="ml-auto rounded-md">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </Badge>
      </div>

      {isLoading ? (
        <SkeletonGrid
          count={6}
          className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={activeFilters ? Search : ListTodo}
          title={activeFilters ? "No matching tasks" : "No tasks yet"}
          description={
            activeFilters
              ? "Try a different search, or clear a filter to see everything."
              : "Add your first task and Study Flow will help you schedule it."
          }
          action={{
            label: activeFilters ? "Clear filters" : "Add task",
            onClick: activeFilters
              ? () => {
                  setQ("");
                  setSubjectId("");
                  setPriority("");
                  setStatus("");
                }
              : openNew,
          }}
        />
      ) : view === "board" ? (
        <BoardView
          groups={groups}
          onOpen={openEdit}
          onStatus={setStatusFor}
          onDelete={(t) => setDeletingId(t.id)}
          patching={patchMut.isPending}
        />
      ) : (
        <ListView
          tasks={tasks}
          onOpen={openEdit}
          onStatus={setStatusFor}
          onDelete={(t) => setDeletingId(t.id)}
          patching={patchMut.isPending}
        />
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        subjects={subjectsQ.data?.subjects ?? []}
      />

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the task. Any logged study sessions stay,
              they just lose the link to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deletingId && deleteMut.mutate(deletingId)}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Board view ---------- */

function BoardView({
  groups,
  onOpen,
  onStatus,
  onDelete,
  patching,
}: {
  groups: Record<Status, Task[]>;
  onOpen: (t: Task) => void;
  onStatus: (t: Task, s: Status) => void;
  onDelete: (t: Task) => void;
  patching: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      {COLUMNS.map((col) => {
        const list = groups[col.id];
        return (
          <div
            key={col.id}
            className="flex w-full flex-col rounded-2xl border border-border bg-muted/30 p-3 lg:w-[320px] lg:shrink-0"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: col.accent }}
                />
                <h3 className="text-sm font-semibold">{col.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {list.length}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {col.hint}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              <AnimatePresence mode="popLayout">
                {list.map((t) => (
                  <motion.div
                    key={t.id}
                    layout={reduce ? false : true}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
                  >
                    <TaskCard
                      task={t}
                      onOpen={() => onOpen(t)}
                      onStatus={(s) => onStatus(t, s)}
                      onDelete={() => onDelete(t)}
                      patching={patching}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {list.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 py-6 text-center">
                  <Inbox className="h-4 w-4 text-muted-foreground/60" />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Nothing here yet
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  onOpen,
  onStatus,
  onDelete,
  patching,
}: {
  task: Task;
  onOpen: () => void;
  onStatus: (s: Status) => void;
  onDelete: () => void;
  patching: boolean;
}) {
  const due = dueLabel(task.dueDate);
  return (
    <div
      className="card-hover group relative rounded-xl border border-border bg-card p-3 shadow-soft"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open task ${task.title}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ background: PRIORITY_DOT[task.priority] }}
          title={`${PRIORITY_LABEL[task.priority]} priority`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground">
            {task.title}
          </p>
          {task.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="ring-focus -mr-1 -mt-1 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
              aria-label="Task actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
            className="w-44"
          >
            <DropdownMenuItem
              disabled={task.status === "todo" || patching}
              onClick={() => onStatus("todo")}
            >
              <Circle className="mr-2 h-3.5 w-3.5" /> Move to To do
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={task.status === "doing" || patching}
              onClick={() => onStatus("doing")}
            >
              <Clock3 className="mr-2 h-3.5 w-3.5" /> Move to Doing
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={task.status === "done" || patching}
              onClick={() => onStatus("done")}
            >
              <Check className="mr-2 h-3.5 w-3.5" /> Mark as done
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpen}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-[18px]">
        {task.subject && (
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
            style={{
              background: `${task.subject.color}1a`,
              color: task.subject.color,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: task.subject.color }}
            />
            {task.subject.name}
          </span>
        )}
        <span
          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
          style={{
            background: `${TYPE_COLOR[task.type]}1a`,
            color: TYPE_COLOR[task.type],
          }}
        >
          {TYPE_LABEL[task.type]}
        </span>
        {task.estMinutes > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            <Timer className="h-3 w-3" />
            {task.estMinutes}m
          </span>
        )}
        {due && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]",
              due.overdue
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {due.label}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- List view ---------- */

type SortKey =
  | "title"
  | "subject"
  | "priority"
  | "dueDate"
  | "status"
  | "estMinutes";

const PRIORITY_RANK: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortableKey: SortKey;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground"
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </TableHead>
  );
}

function ListView({
  tasks,
  onOpen,
  onStatus,
  onDelete,
  patching,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
  onStatus: (t: Task, s: Status) => void;
  onDelete: (t: Task) => void;
  patching: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const toggle = (key: SortKey) => {
    if (sortKey === key) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...tasks];
    const mul = dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title) * mul;
        case "subject":
          return (
            (a.subject?.name ?? "zzz").localeCompare(b.subject?.name ?? "zzz") *
            mul
          );
        case "priority":
          return (
            (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * mul
          );
        case "dueDate": {
          const av = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bv = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return (av - bv) * mul;
        }
        case "estMinutes":
          return (a.estMinutes - b.estMinutes) * mul;
        case "status":
          return (
            (COLUMNS.findIndex((c) => c.id === a.status) -
              COLUMNS.findIndex((c) => c.id === b.status)) *
            mul
          );
        default:
          return 0;
      }
    });
    return arr;
  }, [tasks, sortKey, dir]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <SortHeader
              label="Task"
              sortableKey="title"
              active={sortKey === "title"}
              dir={dir}
              onClick={() => toggle("title")}
            />
            <SortHeader
              label="Subject"
              sortableKey="subject"
              active={sortKey === "subject"}
              dir={dir}
              onClick={() => toggle("subject")}
            />
            <SortHeader
              label="Priority"
              sortableKey="priority"
              active={sortKey === "priority"}
              dir={dir}
              onClick={() => toggle("priority")}
            />
            <SortHeader
              label="Due"
              sortableKey="dueDate"
              active={sortKey === "dueDate"}
              dir={dir}
              onClick={() => toggle("dueDate")}
            />
            <SortHeader
              label="Status"
              sortableKey="status"
              active={sortKey === "status"}
              dir={dir}
              onClick={() => toggle("status")}
            />
            <TableHead className="text-right text-xs font-medium">
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3 w-3" /> Est
              </span>
            </TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((t) => {
            const due = dueLabel(t.dueDate);
            return (
              <TableRow
                key={t.id}
                onClick={() => onOpen(t)}
                className="cursor-pointer"
              >
                <TableCell className="max-w-[280px]">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: PRIORITY_DOT[t.priority] }}
                      title={`${PRIORITY_LABEL[t.priority]} priority`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {TYPE_LABEL[t.type]}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {t.subject ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: t.subject.color }}
                      />
                      {t.subject.name}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs">{PRIORITY_LABEL[t.priority]}</span>
                </TableCell>
                <TableCell>
                  {due ? (
                    <span
                      className={cn(
                        "text-xs",
                        due.overdue
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {due.label}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusPill status={t.status} />
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {t.estMinutes}m
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="ring-focus rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Task actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                      className="w-48"
                    >
                      <DropdownMenuItem
                        disabled={t.status === "todo" || patching}
                        onClick={() => onStatus(t, "todo")}
                      >
                        <Circle className="mr-2 h-3.5 w-3.5" /> Move to To do
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={t.status === "doing" || patching}
                        onClick={() => onStatus(t, "doing")}
                      >
                        <Clock3 className="mr-2 h-3.5 w-3.5" /> Move to Doing
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={t.status === "done" || patching}
                        onClick={() => onStatus(t, "done")}
                      >
                        <Check className="mr-2 h-3.5 w-3.5" /> Mark done
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onOpen(t)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(t)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; bg: string; color: string }> = {
    todo: { label: "To do", bg: "#94a3b81a", color: "#64748b" },
    doing: { label: "Doing", bg: "#f59e0b1a", color: "#b45309" },
    done: { label: "Done", bg: "#2563eb1a", color: "#1d4ed8" },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {status === "done" && <Check className="h-3 w-3" />}
      {status === "doing" && <Clock3 className="h-3 w-3" />}
      {status === "todo" && <Circle className="h-3 w-3" />}
      {s.label}
    </span>
  );
}

/* ---------- New / Edit dialog ---------- */

function TaskDialog({
  open,
  onOpenChange,
  task,
  subjects,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: Task | null;
  subjects: SubjectLite[];
}) {
  const qc = useQueryClient();
  const pushToast = useUI((s) => s.pushToast);
  const isEdit = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [type, setType] = useState<TaskType>("study");
  const [priority, setPriority] = useState<Priority>("medium");
  const [estMinutes, setEstMinutes] = useState<number>(30);
  const [dueDate, setDueDate] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Sync form when dialog opens.
  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setSubjectId(task.subject?.id ?? "none");
      setType(task.type);
      setPriority(task.priority);
      setEstMinutes(task.estMinutes || 30);
      setDueDate(fmtDateInput(task.dueDate));
      setTags(task.tags ?? "");
    } else {
      setTitle("");
      setDescription("");
      setSubjectId("none");
      setType("study");
      setPriority("medium");
      setEstMinutes(30);
      setDueDate("");
      setTags("");
    }
  }, [open, task]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      pushToast({
        title: "Title is required",
        description: "Give your task a name so you can find it later.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      subjectId: subjectId === "none" ? null : subjectId,
      type,
      priority,
      estMinutes: Math.max(5, Math.min(600, Number(estMinutes) || 30)),
      dueDate: dueDate || null,
      tags: tags.trim() || undefined,
    };
    try {
      if (isEdit && task) {
        await api(`/api/tasks/${task.id}`, {
          method: "PATCH",
          json: payload,
        });
        pushToast({
          title: "Task updated",
          description: title.trim(),
          variant: "success",
        });
      } else {
        await api("/api/tasks", { method: "POST", json: payload });
        pushToast({
          title: "Task added",
          description: title.trim(),
          variant: "success",
        });
      }
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onOpenChange(false);
    } catch (err) {
      const e = err as Error;
      pushToast({
        title: isEdit ? "Couldn't update task" : "Couldn't create task",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details below. Changes save when you hit Save."
              : "Capture what you need to do. You can fine-tune later."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish calculus problem set 4"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Notes</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context, links, or sub-steps"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subject</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: s.color }}
                        />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as TaskType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABEL) as TaskType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: TYPE_COLOR[t] }}
                        />
                        {TYPE_LABEL[t]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Priority)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: "#ef4444" }}
                      />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: "#f59e0b" }}
                      />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: "#94a3b8" }}
                      />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-est">Estimated minutes</Label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() =>
                    setEstMinutes((m) => Math.max(5, m - 5))
                  }
                  aria-label="Decrease by 5 minutes"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="task-est"
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  value={estMinutes}
                  onChange={(e) =>
                    setEstMinutes(Number(e.target.value) || 5)
                  }
                  className="w-full text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() =>
                    setEstMinutes((m) => Math.min(600, m + 5))
                  }
                  aria-label="Increase by 5 minutes"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-tags">Tags</Label>
              <Input
                id="task-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="comma, separated"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <ArrowLeftRight className="h-4 w-4 animate-pulse" />
                  {isEdit ? "Saving…" : "Adding…"}
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { TasksPanel as default };
