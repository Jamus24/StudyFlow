"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PanelHeader, EmptyState } from "../panel-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import {
  FolderKanban,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
  BookOpen,
  Brain,
  Calculator,
  Atom,
  FlaskConical,
  Music,
  Code,
  Globe,
  Palette,
  Languages,
  History,
  Microscope,
  CalendarClock,
  Clock3,
  ListTodo,
  Target,
  Sparkles,
} from "lucide-react";
import { LayersIcon } from "@/components/shared/icons";

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface SubjectCount {
  tasks: number;
  sessions: number;
  decks: number;
}

interface Subject {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  examDate?: string | null;
  targetGrade?: string | null;
  description?: string | null;
  archived?: boolean;
  order?: number;
  _count?: SubjectCount;
}

const COLOR_PRESETS = [
  "#2563eb",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#10b981",
  "#f97316",
];

const ICON_OPTIONS: {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "BookOpen", label: "Book", Icon: BookOpen },
  { key: "Brain", label: "Brain", Icon: Brain },
  { key: "Calculator", label: "Maths", Icon: Calculator },
  { key: "Atom", label: "Physics", Icon: Atom },
  { key: "FlaskConical", label: "Chemistry", Icon: FlaskConical },
  { key: "Microscope", label: "Biology", Icon: Microscope },
  { key: "Music", label: "Music", Icon: Music },
  { key: "Code", label: "Code", Icon: Code },
  { key: "Globe", label: "Geography", Icon: Globe },
  { key: "Palette", label: "Art", Icon: Palette },
  { key: "Languages", label: "Languages", Icon: Languages },
  { key: "History", label: "History", Icon: History },
];

function SubjectIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Cmp = ICON_OPTIONS.find((o) => o.key === name)?.Icon ?? BookOpen;
  return <Cmp className={className} />;
}

function countdown(iso?: string | null):
  | { label: string; overdue: boolean; days: number }
  | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round(
    (startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 864e5
  );
  if (days < 0)
    return { label: `${Math.abs(days)}d past`, overdue: true, days };
  if (days === 0) return { label: "today", overdue: false, days };
  if (days === 1) return { label: "tomorrow", overdue: false, days };
  return { label: `in ${days}d`, overdue: false, days };
}

function fmtDateInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function SubjectsPanel() {
  const qc = useQueryClient();
  const pushToast = useUI((s) => s.pushToast);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ subjects: Subject[] }>({
    queryKey: ["/api/subjects"],
    queryFn: () => api("/api/subjects"),
  });

  const subjects = data?.subjects ?? [];

  const archiveMut = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      api(`/api/subjects/${id}`, { method: "PATCH", json: { archived } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subjects"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      pushToast({
        title: "Subject archived",
        description: "It's hidden from your active list. You can restore it later.",
        variant: "success",
      });
    },
    onError: (e: Error) => {
      pushToast({
        title: "Couldn't archive subject",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/api/subjects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subjects"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      pushToast({ title: "Subject deleted", variant: "success" });
      setDeletingId(null);
    },
    onError: (e: Error) => {
      pushToast({
        title: "Couldn't delete subject",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setDialogOpen(true);
  }

  return (
    <div>
      <PanelHeader
        title="Subjects"
        description="Organise your courses and track each one"
        icon={FolderKanban}
        actions={
          <Button size="sm" className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" /> Add subject
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SubjectCardSkeleton key={i} />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No subjects yet"
          description="Add a course to start tracking tasks, sessions, and decks for it."
          action={{ label: "Add subject", onClick: openNew }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s, i) => (
            <motion.div
              key={s.id}
              layout={reduce ? false : true}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: reduce ? 0 : Math.min(i * 0.03, 0.18),
                ease: [0.2, 0.7, 0.2, 1],
              }}
            >
              <SubjectCard
                subject={s}
                onOpen={() => openEdit(s)}
                onArchive={() =>
                  archiveMut.mutate({ id: s.id, archived: !s.archived })
                }
                onDelete={() => setDeletingId(s.id)}
                archiving={archiveMut.isPending}
              />
            </motion.div>
          ))}
        </div>
      )}

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={editing}
      />

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this subject?</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks, sessions, decks, and notes linked to this subject will
              keep their content but lose the subject link. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deletingId && deleteMut.mutate(deletingId)}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete subject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SubjectCard({
  subject,
  onOpen,
  onArchive,
  onDelete,
  archiving,
}: {
  subject: Subject;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  archiving: boolean;
}) {
  const exam = countdown(subject.examDate);
  const count = subject._count ?? { tasks: 0, sessions: 0, decks: 0 };

  return (
    <div
      className="card-hover group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open subject ${subject.name}`}
    >
      {/* top accent bar */}
      <div
        className="h-1.5 w-full"
        style={{ background: subject.color }}
        aria-hidden
      />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: `${subject.color}1a`,
                color: subject.color,
              }}
            >
              <SubjectIcon name={subject.icon} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold leading-tight">
                {subject.name}
              </h3>
              {subject.targetGrade && (
                <Badge
                  variant="secondary"
                  className="mt-1 rounded-md text-[10px]"
                >
                  <Target className="h-3 w-3" /> Target {subject.targetGrade}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="ring-focus rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={`Actions for ${subject.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
              className="w-44"
            >
              <DropdownMenuItem onClick={onOpen}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={archiving}
                onClick={onArchive}
              >
                <Archive className="mr-2 h-3.5 w-3.5" />
                {subject.archived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {subject.description ? (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {subject.description}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground/70 italic">
            No description yet – click to add one.
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          {exam ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                exam.overdue
                  ? "bg-destructive/10 text-destructive"
                  : "bg-accent text-accent-foreground"
              )}
            >
              <CalendarClock className="h-3 w-3" />
              {exam.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" /> No exam date
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
          <MiniStat
            icon={ListTodo}
            value={count.tasks}
            label="Tasks"
            color={subject.color}
          />
          <MiniStat
            icon={Clock3}
            value={count.sessions}
            label="Sessions"
            color={subject.color}
          />
          <MiniStat
            icon={LayersIcon}
            value={count.decks}
            label="Decks"
            color={subject.color}
          />
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-muted/40 py-2">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-md"
        style={{ background: `${color}1a`, color }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="mt-1 font-display text-sm font-semibold">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function SubjectCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="h-1.5 w-full bg-muted" />
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer relative h-10 w-10 overflow-hidden rounded-xl bg-muted/60" />
          <div className="space-y-1.5">
            <div className="skeleton-shimmer relative h-4 w-28 overflow-hidden rounded bg-muted/60" />
            <div className="skeleton-shimmer relative h-3 w-16 overflow-hidden rounded bg-muted/60" />
          </div>
        </div>
        <div className="skeleton-shimmer relative mt-3 h-3 w-full overflow-hidden rounded bg-muted/40" />
        <div className="skeleton-shimmer relative mt-1.5 h-3 w-2/3 overflow-hidden rounded bg-muted/40" />
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="skeleton-shimmer relative h-12 overflow-hidden rounded-lg bg-muted/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Add / Edit dialog ---------- */

function SubjectDialog({
  open,
  onOpenChange,
  subject,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subject: Subject | null;
}) {
  const qc = useQueryClient();
  const pushToast = useUI((s) => s.pushToast);
  const isEdit = !!subject;

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(COLOR_PRESETS[0]);
  const [icon, setIcon] = useState<string>("BookOpen");
  const [examDate, setExamDate] = useState<string>("");
  const [targetGrade, setTargetGrade] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (subject) {
      setName(subject.name);
      setColor(subject.color || COLOR_PRESETS[0]);
      setIcon(subject.icon || "BookOpen");
      setExamDate(fmtDateInput(subject.examDate));
      setTargetGrade(subject.targetGrade ?? "");
      setDescription(subject.description ?? "");
    } else {
      setName("");
      setColor(COLOR_PRESETS[0]);
      setIcon("BookOpen");
      setExamDate("");
      setTargetGrade("");
      setDescription("");
    }
  }, [open, subject]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      pushToast({
        title: "Name is required",
        description: "Give your subject a name so it's easy to find.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      color,
      icon,
      examDate: examDate || undefined,
      targetGrade: targetGrade.trim() || undefined,
      description: description.trim() || undefined,
    };
    try {
      if (isEdit && subject) {
        await api(`/api/subjects/${subject.id}`, {
          method: "PATCH",
          json: payload,
        });
        pushToast({
          title: "Subject updated",
          description: name.trim(),
          variant: "success",
        });
      } else {
        await api("/api/subjects", { method: "POST", json: payload });
        pushToast({
          title: "Subject added",
          description: name.trim(),
          variant: "success",
        });
      }
      qc.invalidateQueries({ queryKey: ["/api/subjects"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onOpenChange(false);
    } catch (err) {
      const e = err as Error;
      pushToast({
        title: isEdit ? "Couldn't update subject" : "Couldn't create subject",
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
          <DialogTitle>{isEdit ? "Edit subject" : "New subject"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details. Color and icon help you spot it across Study Flow."
              : "Pick a colour and icon so this subject stands out in your calendar and tasks."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subj-name">Name</Label>
            <Input
              id="subj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AP Calculus AB"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "ring-focus relative h-8 w-8 rounded-full transition-transform hover:scale-110",
                    color === c &&
                      "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                  )}
                  style={{ background: c }}
                  aria-label={`Use color ${c}`}
                  aria-pressed={color === c}
                >
                  {color === c && (
                    <span className="absolute inset-0 flex items-center justify-center text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              ))}
              <div className="ml-1 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ background: color }}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {color}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    <span className="flex items-center gap-2">
                      <o.Icon className="h-3.5 w-3.5" />
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="subj-exam">Exam date</Label>
              <Input
                id="subj-exam"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subj-grade">Target grade</Label>
              <Input
                id="subj-grade"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                placeholder="e.g. A*, 85%"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subj-desc">Description</Label>
            <Textarea
              id="subj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topics, syllabus code, or what this subject covers"
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? isEdit
                  ? "Saving…"
                  : "Adding…"
                : isEdit
                  ? "Save changes"
                  : "Add subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { SubjectsPanel as default };
