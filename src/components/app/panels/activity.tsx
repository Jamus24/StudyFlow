"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, CheckCircle2, Sparkles, FolderKanban, StickyNote, Brain,
  CreditCard, LogIn, Activity, Search, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { api } from "@/lib/fetch";
import { PanelHeader, LoadingBlock, EmptyState } from "../panel-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  action: string;
  meta: string;
  createdAt: string;
}
interface ActivityResponse {
  items: ActivityItem[];
  page: number;
  pageSize: number;
  total: number;
}

const ACTION_META: Record<
  string,
  { Icon: any; color: string; label: (meta: string) => string }
> = {
  "task.completed": { Icon: CheckCircle2, color: "#2563eb", label: (m) => m ? `Completed ${m}` : "Completed a task" },
  "session.logged": { Icon: Clock, color: "#f59e0b", label: (m) => m ? `Logged ${m} session` : "Logged a study session" },
  "plan.generated": { Icon: Sparkles, color: "#f59e0b", label: (m) => m ? `Generated plan · ${m}` : "Generated a study plan" },
  "subject.created": { Icon: FolderKanban, color: "#2563eb", label: (m) => m ? `Added subject · ${m}` : "Added a subject" },
  "deck.created": { Icon: FolderKanban, color: "#06b6d4", label: (m) => m ? `Created deck · ${m}` : "Created a flashcard deck" },
  "note.created": { Icon: StickyNote, color: "#8b5cf6", label: (m) => m ? `Wrote a note · ${m}` : "Wrote a note" },
  "tutor.message": { Icon: Brain, color: "#8b5cf6", label: () => "Asked the AI tutor" },
  "billing.upgrade": { Icon: CreditCard, color: "#ef4444", label: (m) => m ? `Upgraded · ${m}` : "Upgraded plan" },
  "billing.cancel": { Icon: CreditCard, color: "#ef4444", label: () => "Canceled subscription" },
  "auth.login": { Icon: LogIn, color: "#2563eb", label: () => "Signed in" },
  "auth.register": { Icon: LogIn, color: "#2563eb", label: () => "Created account" },
  "profile.updated": { Icon: Activity, color: "#8b5cf6", label: () => "Updated profile" },
};

const reduce =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PAGE_SIZE = 15;

export function ActivityPanel() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  // debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isFetching } = useQuery<ActivityResponse>({
    queryKey: ["/api/activity", { page, q: debounced }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (debounced) params.set("q", debounced);
      return api(`/api/activity?${params.toString()}`);
    },
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  // group by day
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    for (const it of items) {
      const key = new Date(it.createdAt).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div>
      <PanelHeader
        title="Activity"
        description="Everything you've done, in order"
        icon={Clock}
      />

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search activity…"
          className="pl-9"
          aria-label="Search activity"
        />
        {isFetching && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading && !data ? (
          <div className="space-y-px bg-border/40">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingBlock key={i} className="h-16 rounded-none" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-2">
            <EmptyState
              icon={Activity}
              title={debounced ? "No matches" : "No activity yet"}
              description={
                debounced
                  ? `We couldn't find anything matching "${debounced}".`
                  : "Start studying – logging sessions, completing tasks and generating plans will show up here."
              }
            />
          </div>
        ) : (
          <ScrollArea className="max-h-[640px]">
            <div className="p-5 sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={page + debounced}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {grouped.map(([dayLabel, dayItems]) => (
                    <div key={dayLabel} className="mb-6 last:mb-0">
                      <div className="sticky top-0 z-[1] mb-2 bg-gradient-to-b from-card to-card/85 px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {formatDayHeading(dayLabel)}
                      </div>

                      <ol className="relative ml-3 border-l border-border">
                        {dayItems.map((item, idx) => {
                          const meta = ACTION_META[item.action] ?? {
                            Icon: Activity,
                            color: "#94a3b8",
                            label: (m: string) => item.action.replace(/[._]/g, " ") + (m ? ` · ${m}` : ""),
                          };
                          const isLast = idx === dayItems.length - 1;
                          return (
                            <motion.li
                              key={item.id}
                              initial={reduce ? false : { opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.18, delay: reduce ? 0 : Math.min(idx * 0.02, 0.18) }}
                              className="relative mb-3 last:mb-0 pl-5"
                            >
                              {/* node */}
                              <span
                                className="absolute -left-[7px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-card"
                                style={{ background: meta.color }}
                              />
                              <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/15">
                                <div className="flex items-center gap-2">
                                  <meta.Icon
                                    className="h-3.5 w-3.5 shrink-0"
                                    style={{ color: meta.color }}
                                  />
                                  <p className="text-sm leading-tight text-foreground/90">
                                    {meta.label(item.meta)}
                                  </p>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                </p>
                              </div>
                              {isLast && <span className="absolute -left-px top-3.5 h-full w-px bg-card" />}
                            </motion.li>
                          );
                        })}
                      </ol>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {debounced ? (
              <>Showing {from}–{to} of {total} for "{debounced}"</>
            ) : (
              <>Showing {from}–{to} of {total} activities</>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Badge variant="secondary" className="rounded-md font-mono text-[10px]">
              Page {page} of {totalPages}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDayHeading(dayLabel: string) {
  const d = new Date(dayLabel);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

export { ActivityPanel as default };
