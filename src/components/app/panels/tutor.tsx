"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PanelHeader } from "../panel-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Plus,
  Send,
  Search,
  Trash2,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  FileText,
  MessagesSquare,
  Bot,
} from "lucide-react";

interface TutorThread {
  id: string;
  title: string;
  subjectId?: string | null;
  pinned?: boolean;
  createdAt?: string;
  updatedAt: string;
  _count: { messages: number };
}
interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
interface ThreadDetail extends TutorThread {
  messages: TutorMessage[];
  subject?: { name: string } | null;
}
interface Subject {
  id: string;
  name: string;
  color: string;
}

const SUGGESTIONS = [
  {
    icon: HelpCircle,
    label: "Explain a concept",
    prompt:
      "Explain the concept of oxidative phosphorylation like I'm seeing it for the first time.",
  },
  {
    icon: Sparkles,
    label: "Quiz me",
    prompt: "Quiz me with five short questions on the French Revolution. Wait for my answer after each.",
  },
  {
    icon: FileText,
    label: "Summarise my notes",
    prompt:
      "Summarise the most important ideas I should remember from a chapter on supply and demand.",
  },
];

export function TutorPanel() {
  const { pushToast } = useUI();
  const qc = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [subjectId, setSubjectId] = useState<string>("__none__");

  // For existing threads messages are derived straight from the query cache
  // (no local sync state). For brand-new chats before a threadId exists we keep a
  // tiny local pending buffer.
  const [pendingMessages, setPendingMessages] = useState<TutorMessage[]>([]);
  const [sending, setSending] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // thread list + subjects
  const threadsQuery = useQuery<{ threads: TutorThread[] }>({
    queryKey: ["/api/tutor"],
    queryFn: () => api("/api/tutor"),
    refetchInterval: 60_000,
  });
  const subjectsQuery = useQuery<{ subjects: Subject[] }>({
    queryKey: ["/api/subjects"],
    queryFn: () => api("/api/subjects"),
  });

  // active thread detail
  const threadQuery = useQuery<{ thread: ThreadDetail }>({
    queryKey: ["/api/tutor/threads", activeId],
    queryFn: () => api(`/api/tutor/threads/${activeId}`),
    enabled: !!activeId,
  });

  // Derived messages – no useEffect syncing required.
  const messages: TutorMessage[] = useMemo(() => {
    if (!activeId) return pendingMessages;
    return threadQuery.data?.thread.messages ?? [];
  }, [activeId, threadQuery.data, pendingMessages]);

  // autoscroll on new message / typing
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // auto-grow textarea
  const resize = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 168) + "px";
  }, []);

  const filtered = useMemo(() => {
    const list = threadsQuery.data?.threads ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((t) => t.title.toLowerCase().includes(q));
  }, [threadsQuery.data, search]);

  const send = useMutation({
    mutationFn: (vars: { threadId?: string; subjectId?: string; message: string }) =>
      api<{ threadId: string; message: TutorMessage }>("/api/tutor", { method: "POST", json: vars }),
    onMutate: () => setSending(true),
    onSuccess: (res, vars) => {
      const assistant = res.message;
      if (vars.threadId) {
        // Existing thread – replace any pending user message with the assistant reply.
        // The real user message will arrive via the refetch.
        qc.setQueryData<{ thread: ThreadDetail }>(["/api/tutor/threads", vars.threadId], (old) => {
          if (!old) return old;
          const cleaned = old.thread.messages.filter((m) => !m.id.startsWith("pending-"));
          return { thread: { ...old.thread, messages: [...cleaned, assistant] } };
        });
        qc.invalidateQueries({ queryKey: ["/api/tutor/threads", vars.threadId] });
      } else {
        // Brand-new chat – switch activeId and pre-seed the cache.
        setPendingMessages([]);
        setActiveId(res.threadId);
        qc.setQueryData<{ thread: ThreadDetail }>(["/api/tutor/threads", res.threadId], {
          thread: {
            id: res.threadId,
            title: vars.message.slice(0, 40) + (vars.message.length > 40 ? "…" : ""),
            subjectId: vars.subjectId ?? null,
            pinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _count: { messages: 2 },
            messages: [assistant],
            subject: null,
          },
        });
        qc.invalidateQueries({ queryKey: ["/api/tutor/threads", res.threadId] });
      }
      qc.invalidateQueries({ queryKey: ["/api/tutor"] });
    },
    onError: (e: unknown, vars) => {
      const err = e as Error & { code?: string };
      // rollback optimistic user message
      if (vars.threadId) {
        qc.setQueryData<{ thread: ThreadDetail }>(["/api/tutor/threads", vars.threadId], (old) => {
          if (!old) return old;
          return {
            thread: {
              ...old.thread,
              messages: old.thread.messages.filter((m) => !m.id.startsWith("pending-")),
            },
          };
        });
      } else {
        setPendingMessages((prev) => prev.filter((m) => !m.id.startsWith("pending-")));
      }
      pushToast({
        title: "Couldn't send message",
        description: err.message || "Please try again in a moment.",
        variant: "destructive",
      });
    },
    onSettled: () => setSending(false),
  });

  const deleteThread = useMutation({
    mutationFn: (id: string) => api(`/api/tutor/threads/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      if (activeId === id) {
        setActiveId(null);
        setMobileView("list");
      }
      qc.removeQueries({ queryKey: ["/api/tutor/threads", id] });
      qc.invalidateQueries({ queryKey: ["/api/tutor"] });
      pushToast({ title: "Conversation deleted", variant: "default" });
    },
    onError: () =>
      pushToast({
        title: "Couldn't delete",
        description: "Try again in a moment.",
        variant: "destructive",
      }),
  });

  const startNewChat = () => {
    setActiveId(null);
    setPendingMessages([]);
    setMobileView("chat");
    setTimeout(() => taRef.current?.focus(), 30);
  };

  const openThread = (id: string) => {
    setActiveId(id);
    setMobileView("chat");
  };

  const handleSend = (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || sending) return;
    const optimistic: TutorMessage = {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    if (activeId) {
      qc.setQueryData<{ thread: ThreadDetail }>(["/api/tutor/threads", activeId], (old) => {
        if (!old) return old;
        return { thread: { ...old.thread, messages: [...old.thread.messages, optimistic] } };
      });
    } else {
      setPendingMessages((prev) => [...prev, optimistic]);
    }
    setInput("");
    requestAnimationFrame(resize);
    send.mutate({
      threadId: activeId ?? undefined,
      subjectId: subjectId !== '__none__' ? subjectId : undefined,
      message: text,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !sending;
  const activeThread = threadQuery.data?.thread;

  return (
    <div className="flex flex-1 flex-col">
      <PanelHeader
        title="AI Tutor"
        description="Ask anything – it knows your subjects"
        icon={Brain}
        actions={
          <Button size="sm" className="gap-2" onClick={startNewChat}>
            <Plus className="h-4 w-4" /> New chat
          </Button>
        }
      />

      <div className="grid flex-1 min-h-0 grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft lg:grid-cols-[300px_1fr]">
        {/* Sidebar – thread list */}
        <aside
          className={cn(
            "flex min-h-0 flex-col border-border bg-sidebar/40 lg:border-r",
            mobileView === "chat" ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="h-9 pl-8 text-sm"
                aria-label="Search conversations"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {threadsQuery.isLoading ? (
                <div className="space-y-2 p-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 rounded-xl border border-border p-3"
                    >
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-10 text-center text-xs text-muted-foreground">
                  <MessagesSquare className="mx-auto mb-2 h-5 w-5 opacity-40" />
                  {search ? "No matches." : "No conversations yet."}
                </div>
              ) : (
                <ul className="space-y-0.5">
                  <AnimatePresence initial={false}>
                    {filtered.map((t) => {
                      const active = activeId === t.id;
                      return (
                        <motion.li
                          key={t.id}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => openThread(t.id)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openThread(t.id); } }}
                            className={cn(
                              "group relative flex w-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer",
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
                            <p
                              className={cn(
                                "truncate text-sm font-medium",
                                active ? "text-foreground" : "text-foreground/90"
                              )}
                            >
                              {t.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>{timeAgo(t.updatedAt)}</span>
                              <span aria-hidden>·</span>
                              <span>{t._count.messages} msgs</span>
                            </div>
                            <button
                              type="button"
                              aria-label={`Delete "${t.title}"`}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteThread.mutate(t.id);
                              }}
                              className="absolute right-2 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:flex group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Conversation panel */}
        <section
          className={cn(
            "flex min-h-0 flex-col bg-card",
            mobileView === "list" ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Top bar */}
          <div className="flex h-12 items-center gap-2 border-b border-border px-3">
            <button
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
              onClick={() => setMobileView("list")}
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Bot className="h-4 w-4 shrink-0 text-brand" />
              <p className="truncate text-sm font-medium">
                {activeThread?.title ?? "New conversation"}
              </p>
            </div>
            {activeThread?.subject?.name && (
              <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                {activeThread.subject.name}
              </span>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-card to-transparent" />
            <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 sm:px-6">
              <AnimatePresence initial={false}>
                {isEmpty && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <div className="relative mb-4">
                      <div className="absolute -inset-3 bg-brand/10 blur-3xl rounded-full opacity-30" />
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                        <Brain className="h-6 w-6" />
                      </div>
                    </div>
                    <h3 className="font-display text-xl font-semibold tracking-tight">
                      What should we work on?
                    </h3>
                    <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                      Ask anything – past papers, sticky concepts, study plans.
                      Study Flow tailors its answer to your subjects.
                    </p>
                    <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-3">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => {
                            setInput(s.prompt);
                            requestAnimationFrame(() => {
                              resize();
                              taRef.current?.focus();
                              // place cursor at end
                              const len = s.prompt.length;
                              taRef.current?.setSelectionRange(len, len);
                            });
                          }}
                          disabled={sending}
                          className="card-hover group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-brand/30 hover:bg-accent/40"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                            <s.icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-medium leading-tight">
                            {s.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {messages.map((m, i) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
                    className={cn(
                      "flex items-end gap-2",
                      m.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {m.role === "assistant" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div
                      aria-live={m.role === "assistant" ? "polite" : undefined}
                      className={cn(
                        "max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[75%]",
                        m.role === "user"
                          ? "rounded-2xl rounded-br-md bg-brand text-brand-foreground"
                          : "rounded-2xl rounded-bl-md border border-border bg-muted"
                      )}
                    >
                      {m.role === "assistant" ? (
                        <AssistantContent content={m.content} />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}

                {sending && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-end gap-2"
                    aria-live="polite"
                    aria-label="Assistant is typing"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-muted px-4 py-3">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: d * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-card to-transparent" />
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3">
            <div className="mx-auto max-w-3xl">
              {subjectsQuery.data?.subjects?.length ? (
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Context
                  </span>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger size="sm" className="h-7 w-fit gap-1 rounded-full border-dashed text-xs">
                      <SelectValue placeholder="Any subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Any subject</SelectItem>
                      {subjectsQuery.data.subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 transition-colors focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10">
                <Textarea
                  ref={taRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    resize();
                  }}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
                  className="min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm shadow-none focus-visible:ring-0"
                  aria-label="Message the tutor"
                  disabled={sending}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1.5 px-1 text-[10px] text-muted-foreground/70">
                Study Flow can make mistakes – verify anything important.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* -------- markdown-ish renderer for assistant messages -------- */

function AssistantContent({ content }: { content: string }) {
  const blocks = useMemo(() => parseBlocks(content), [content]);
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => {
        if (b.type === "math") {
          return (
            <div
              key={i}
              className="my-2 flex justify-center overflow-x-auto py-1"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(b.tex, { throwOnError: false, displayMode: true }),
              }}
            />
          );
        }
        if (b.type === "code") {
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-[12px] leading-relaxed"
            >
              <code>{b.text}</code>
            </pre>
          );
        }
        if (b.type === "list") {
          const ordered = b.ordered;
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag
              key={i}
              className={cn(
                "space-y-1 pl-4 text-sm",
                ordered ? "list-decimal" : "list-disc"
              )}
            >
              {b.items.map((it, j) => (
                <li key={j} className="leading-relaxed">
                  {renderInline(it)}
                </li>
              ))}
            </Tag>
          );
        }
        if (b.type === "heading") {
          return (
            <p key={i} className="font-display text-sm font-semibold tracking-tight">
              {renderInline(b.text)}
            </p>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap break-words leading-relaxed">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { type: "para"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "code"; text: string }
  | { type: "math"; tex: string };

function parseBlocks(src: string): Block[] {
  // Extract display math $$...$$ first, replace with placeholders
  const mathBlocks: { tex: string; placeholder: string }[] = [];
  let cleaned = src;
  const mathRe = /\$\$([\s\S]*?)\$\$/g;
  let m: RegExpExecArray | null;
  while ((m = mathRe.exec(cleaned)) !== null) {
    const ph = `__MATH_${mathBlocks.length}__`;
    mathBlocks.push({ tex: m[1].trim(), placeholder: ph });
  }
  cleaned = cleaned.replace(mathRe, () => {
    const ph = `__MATH_${mathBlocks.length - 1}__`;
    return `\n${ph}\n`;
  });

  const lines = cleaned.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { items: string[]; ordered: boolean } | null = null;
  let code: string[] | null = null;

  const flushPara = () => {
    if (para.length) {
      const text = para.join(" ").trim();
      if (text) {
        if (/^(#{1,3})\s+/.test(text)) {
          blocks.push({ type: "heading", text: text.replace(/^#{1,3}\s+/, "") });
        } else {
          blocks.push({ type: "para", text });
        }
      }
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ type: "list", items: list.items, ordered: list.ordered });
      list = null;
    }
  };
  const flushCode = () => {
    if (code) {
      blocks.push({ type: "code", text: code.join("\n") });
      code = null;
    }
  };

  for (const raw of lines) {
    const line = raw;
    if (line.trim().startsWith("```")) {
      if (code) {
        flushCode();
      } else {
        flushPara();
        flushList();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    // Display math placeholder
    const mathMatch = line.match(/^__MATH_(\d+)__$/);
    if (mathMatch) {
      flushPara();
      flushList();
      const idx = parseInt(mathMatch[1], 10);
      if (mathBlocks[idx]) {
        blocks.push({ type: "math", tex: mathBlocks[idx].tex });
      }
      continue;
    }
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ulMatch) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { items: [], ordered: false };
      }
      list.items.push(ulMatch[1]);
      continue;
    }
    if (olMatch) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { items: [], ordered: true };
      }
      list.items.push(olMatch[1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  flushCode();
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  // Split on bold, inline code, and inline math ($...$)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$)/g);
  return parts.map((p, i) => {
    // Bold
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return (
        <strong key={i} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    }
    // Inline code
    if (/^`[^`]+`$/.test(p)) {
      return (
        <code
          key={i}
          className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[0.82em] text-foreground/90"
        >
          {p.slice(1, -1)}
        </code>
      );
    }
    // Inline math: $...$
    if (/^\$.+\$$/.test(p)) {
      const tex = p.slice(1, -1);
      try {
        const html = katex.renderToString(tex, { throwOnError: false, displayMode: false });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} className="inline-block align-middle" />;
      } catch {
        return <code key={i} className="text-xs text-red-400">{tex}</code>;
      }
    }
    return <span key={i}>{p}</span>;
  });
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

export { TutorPanel as default };