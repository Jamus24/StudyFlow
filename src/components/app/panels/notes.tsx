"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PanelHeader, EmptyState, LoadingBlock } from "../panel-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  StickyNote,
  Plus,
  Search,
  Trash2,
  ArrowLeft,
  Pin,
  PinOff,
  Sparkles,
  Check,
  Copy,
  Loader2,
  Tag,
  Clock,
  FileText,
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  color: string;
}
interface Note {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  subjectId?: string | null;
  subject?: { name: string; color: string } | null;
  pinned: boolean;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

type SaveState = "idle" | "saving" | "saved";

export function NotesPanel() {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  // editor state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subjectId, setSubjectId] = useState<string>("__none__");
  const [tags, setTags] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notesQuery = useQuery<{ notes: Note[] }>({
    queryKey: ["/api/notes", search],
    queryFn: () => api(`/api/notes${search ? `?q=${encodeURIComponent(search)}` : ""}`),
  });
  const subjectsQuery = useQuery<{ subjects: Subject[] }>({
    queryKey: ["/api/subjects"],
    queryFn: () => api("/api/subjects"),
  });

  const activeNote = useMemo(
    () => notesQuery.data?.notes.find((n) => n.id === activeId) ?? null,
    [notesQuery.data, activeId]
  );

  // hydrate editor from the active note – uses React's "adjust state during render"
  // pattern so we don't call setState inside an effect.
  const [loadedId, setLoadedId] = useState<string | null | undefined>(undefined);
  if (activeId !== loadedId) {
    setLoadedId(activeId);
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
      setSubjectId(activeNote.subjectId || "__none__");
      setTags(activeNote.tags ?? "");
      setPinned(activeNote.pinned);
      setSummary(activeNote.summary ?? null);
    } else {
      setTitle("");
      setContent("");
      setSubjectId("");
      setTags("");
      setPinned(false);
      setSummary(null);
    }
    setSaveState("idle");
  }

  // reset the dirty flag whenever we hydrate a new note (refs may not be mutated
  // during render, so we do it in an effect keyed on the loaded id).
  useEffect(() => {
    dirtyRef.current = false;
  }, [loadedId]);

  // auto-grow textarea
  const resize = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(ta.scrollHeight, 320) + "px";
  }, []);

  useEffect(() => {
    resize();
  }, [content, resize]);

  const updateNote = useMutation({
    mutationFn: (vars: {
      id: string;
      title?: string;
      content?: string;
      subjectId?: string | null;
      tags?: string;
      pinned?: boolean;
    }) =>
      api<{ note: Note }>(`/api/notes/${vars.id}`, {
        method: "PATCH",
        json: {
          title: vars.title,
          content: vars.content,
          subjectId: vars.subjectId ?? undefined,
          tags: vars.tags,
          pinned: vars.pinned,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notes"] });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1600);
      dirtyRef.current = false;
    },
    onError: (e: unknown) => {
      const err = e as Error;
      pushToast({
        title: "Couldn't save",
        description: err.message,
        variant: "destructive",
      });
      setSaveState("idle");
    },
  });

  // debounced save – setSaveState("saving") is moved into markDirty so we don't
  // call setState inside this effect.
  useEffect(() => {
    if (!activeId || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateNote.mutate({
        id: activeId,
        title: title.trim() || "Untitled",
        content,
        subjectId: subjectId !== '__none__' ? subjectId : null,
        tags,
        pinned,
      });
    }, 900);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [activeId, title, content, subjectId, tags, pinned, updateNote]);

  const createNote = useMutation({
    mutationFn: () =>
      api<{ note: Note }>("/api/notes", {
        method: "POST",
        json: { title: "Untitled note", content: "", tags: "", pinned: false },
      }),
    onSuccess: (res) => {
      // pre-seed cache so the editor hydrates immediately
      qc.setQueryData<{ notes: Note[] }>(["/api/notes", search], (old) => {
        if (!old) return { notes: [res.note] };
        return { notes: [res.note, ...old.notes] };
      });
      qc.invalidateQueries({ queryKey: ["/api/notes"] });
      setActiveId(res.note.id);
      setMobileView("editor");
      setTimeout(() => {
        taRef.current?.focus();
        const ti = document.getElementById("note-title-input") as HTMLInputElement | null;
        ti?.focus();
        ti?.select();
      }, 50);
    },
    onError: () =>
      pushToast({ title: "Couldn't create note", variant: "destructive" }),
  });

  const deleteNote = useMutation({
    mutationFn: (id: string) => api(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      qc.setQueryData<{ notes: Note[] }>(["/api/notes", search], (old) => {
        if (!old) return old;
        return { notes: old.notes.filter((n) => n.id !== id) };
      });
      qc.invalidateQueries({ queryKey: ["/api/notes"] });
      setActiveId(null);
      setMobileView("list");
      setConfirmDelete(false);
      pushToast({ title: "Note deleted", variant: "default" });
    },
    onError: () =>
      pushToast({ title: "Couldn't delete note", variant: "destructive" }),
  });

  const summarize = useMutation({
    mutationFn: (id: string) =>
      api<{ summary: string }>(`/api/notes/${id}/summarize`, { method: "POST" }),
    onMutate: () => setSummarizing(true),
    onSuccess: (res) => {
      setSummary(res.summary);
      qc.invalidateQueries({ queryKey: ["/api/notes"] });
      pushToast({ title: "Summary ready", variant: "success" });
    },
    onError: (e: unknown) => {
      const err = e as Error;
      pushToast({
        title: "Couldn't summarise",
        description: err.message,
        variant: "destructive",
      });
    },
    onSettled: () => setSummarizing(false),
  });

  const onCopySummary = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      pushToast({ title: "Summary copied", variant: "success" });
    } catch {
      pushToast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  const openNote = (id: string) => {
    setActiveId(id);
    setMobileView("editor");
  };

  const markDirty = () => {
    dirtyRef.current = true;
    setSaveState("saving");
  };

  // sort: pinned first, then most recently updated
  const sortedNotes = useMemo(() => {
    const list = notesQuery.data?.notes ?? [];
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notesQuery.data]);

  return (
    <div className="flex flex-col">
      <PanelHeader
        title="Notes"
        description="Capture and condense what you learn"
        icon={StickyNote}
        actions={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => createNote.mutate()}
            disabled={createNote.isPending}
          >
            {createNote.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New note
          </Button>
        }
      />

      <div className="grid h-[calc(100vh-13rem)] min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft lg:grid-cols-[340px_1fr]">
        {/* List pane */}
        <aside
          className={cn(
            "flex flex-col border-border bg-sidebar/40 lg:border-r",
            mobileView === "editor" ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes"
                className="h-9 pl-8 text-sm"
                aria-label="Search notes"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {notesQuery.isLoading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border p-3">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-full" />
                    <Skeleton className="mt-1 h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : sortedNotes.length === 0 ? (
              <div className="px-3 py-12 text-center text-xs text-muted-foreground">
                <StickyNote className="mx-auto mb-2 h-5 w-5 opacity-40" />
                {search ? "No matching notes." : "No notes yet."}
              </div>
            ) : (
              <ul className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {sortedNotes.map((n) => {
                    const active = activeId === n.id;
                    return (
                      <motion.li
                        key={n.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <button
                          onClick={() => openNote(n.id)}
                          className={cn(
                            "group relative flex w-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
                            active
                              ? "border-brand/30 bg-brand/8"
                              : "border-transparent hover:border-border hover:bg-accent/50"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-brand transition-all",
                              active ? "w-1" : "w-0"
                            )}
                          />
                          <div className="flex items-center gap-2">
                            {n.pinned && (
                              <Pin className="h-3 w-3 shrink-0 fill-gold text-gold" />
                            )}
                            <p className="truncate text-sm font-medium">
                              {n.title || "Untitled"}
                            </p>
                          </div>
                          {n.content ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {snippet(n.content)}
                            </p>
                          ) : (
                            <p className="text-xs italic text-muted-foreground/60">Empty note</p>
                          )}
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{timeAgo(n.updatedAt)}</span>
                            {n.subject && (
                              <>
                                <span aria-hidden>·</span>
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 font-medium"
                                  style={{ color: n.subject.color }}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: n.subject.color }} />
                                  {n.subject.name}
                                </span>
                              </>
                            )}
                          </div>
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </aside>

        {/* Editor pane */}
        <section
          className={cn(
            "flex flex-col bg-card",
            mobileView === "list" ? "hidden lg:flex" : "flex"
          )}
        >
          {!activeNote ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={StickyNote}
                title="Pick a note"
                description="Choose one from the list, or start a fresh note with your next idea."
                action={{ label: "New note", onClick: () => createNote.mutate() }}
              />
            </div>
          ) : (
            <>
              {/* Top bar */}
              <div className="flex h-12 items-center gap-2 border-b border-border px-3">
                <button
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
                  onClick={() => setMobileView("list")}
                  aria-label="Back to notes"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    Last edited {timeAgo(activeNote.updatedAt)}
                  </span>
                </div>
                <SaveBadge state={saveState} />
                <button
                  onClick={() => setPinned((p) => { markDirty(); return !p; })}
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    pinned
                      ? "bg-gold/15 text-gold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  aria-label={pinned ? "Unpin note" : "Pin note"}
                  aria-pressed={pinned}
                >
                  {pinned ? <Pin className="h-4 w-4 fill-gold" /> : <PinOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
                <Select
                  value={subjectId}
                  onValueChange={(v) => {
                    setSubjectId(v);
                    markDirty();
                  }}
                >
                  <SelectTrigger size="sm" className="h-8 w-fit text-xs">
                    <SelectValue placeholder="No subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No subject</SelectItem>
                    {subjectsQuery.data?.subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="mx-1 h-5" />

                <div className="relative flex items-center">
                  <Tag className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={tags}
                    onChange={(e) => {
                      setTags(e.target.value);
                      markDirty();
                    }}
                    placeholder="tags, comma, separated"
                    className="h-8 w-56 pl-7 text-xs"
                    aria-label="Note tags"
                  />
                </div>

                <div className="ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => summarize.mutate(activeNote.id)}
                    disabled={summarizing || content.trim().length < 40}
                  >
                    {summarizing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-brand" />
                    )}
                    Summarise with AI
                  </Button>
                </div>
              </div>

              {/* Scrollable editor */}
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
                  <input
                    id="note-title-input"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      markDirty();
                    }}
                    onBlur={() => {
                      if (dirtyRef.current && activeId) {
                        updateNote.mutate({
                          id: activeId,
                          title: title.trim() || "Untitled",
                          content,
                          subjectId: subjectId !== '__none__' ? subjectId : null,
                          tags,
                          pinned,
                        });
                      }
                    }}
                    placeholder="Untitled"
                    className="w-full bg-transparent font-display text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/40 sm:text-3xl"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {content.trim() ? wordCount(content) : "0 words"}
                  </p>

                  <Textarea
                    ref={taRef}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      markDirty();
                    }}
                    onBlur={() => {
                      if (dirtyRef.current && activeId) {
                        updateNote.mutate({
                          id: activeId,
                          title: title.trim() || "Untitled",
                          content,
                          subjectId: subjectId !== '__none__' ? subjectId : null,
                          tags,
                          pinned,
                        });
                      }
                    }}
                    placeholder="Start writing… Paste a lecture transcript, class notes, or your own ideas."
                    className="mt-4 min-h-[60vh] w-full resize-none border-0 bg-transparent px-0 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Summary callout */}
              <AnimatePresence>
                {summary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-brand/20 bg-brand/5"
                  >
                    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-8">
                      <div className="rounded-2xl border border-brand/25 bg-card p-4 shadow-soft">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                              <Sparkles className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-display text-sm font-semibold">AI summary</p>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Generated from this note
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 text-xs"
                            onClick={onCopySummary}
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </Button>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </section>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              "{activeNote?.title || "Untitled"}" will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => activeId && deleteNote.mutate(activeId)}
            >
              Delete note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <motion.span
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand"
      >
        <Check className="h-3 w-3" /> Saved
      </motion.span>
    );
  }
  return null;
}

function snippet(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 110);
}

function wordCount(text: string) {
  const n = text.trim().split(/\s+/).filter(Boolean).length;
  return `${n} word${n === 1 ? "" : "s"}`;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export { NotesPanel as default };
