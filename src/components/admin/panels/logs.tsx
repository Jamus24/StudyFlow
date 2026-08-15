"use client";

import { useState } from "react";
import { PanelHeader, EmptyState } from "@/components/app/panel-utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollText, Search, ChevronLeft, ChevronRight, Terminal } from "lucide-react";
import {
  useAdminLogs,
  useDebounced,
  type AdminLog,
  ForbiddenState,
  ErrorState,
  isForbidden,
  fmtDateTime,
} from "../lib";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export function AdminLogs() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("");
  const dq = useDebounced(q, 350);

  const logsQ = useAdminLogs({
    page,
    pageSize: PAGE_SIZE,
    q: dq || undefined,
    level: level || undefined,
  });

  if (logsQ.error && isForbidden(logsQ.error)) {
    return (
      <div>
        <PanelHeader title="System logs" description="What's happening under the hood" icon={ScrollText} />
        <ForbiddenState />
      </div>
    );
  }

  return (
    <div>
      <PanelHeader
        title="System logs"
        description="What's happening under the hood"
        icon={ScrollText}
        actions={
          <Badge variant="outline" className="gap-1.5 rounded-md font-mono text-[10px] uppercase tracking-wider">
            <span className={cn("h-1.5 w-1.5 rounded-full", logsQ.isFetching ? "animate-pulse bg-brand" : "bg-muted-foreground")} />
            auto-refresh · 15s
          </Badge>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by message…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-9 font-mono text-xs"
              aria-label="Search logs"
            />
          </div>
          <Select
            value={level || "all"}
            onValueChange={(v) => {
              setLevel(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filter by level">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {logsQ.isLoading ? (
          <div className="space-y-1 p-3 font-mono">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="relative h-6 overflow-hidden rounded bg-muted/40">
                <div className="skeleton-shimmer absolute inset-0" />
              </div>
            ))}
          </div>
        ) : logsQ.error ? (
          <div className="p-4">
            <ErrorState message={(logsQ.error as Error).message} onRetry={() => logsQ.refetch()} />
          </div>
        ) : !logsQ.data?.logs.length ? (
          <div className="p-4">
            <EmptyState
              icon={Terminal}
              title="No logs match"
              description={
                level || q
                  ? "Try clearing your filters or searching for a different keyword."
                  : "The system hasn't recorded any logs yet."
              }
            />
          </div>
        ) : (
          <>
            <div className="max-h-[60vh] overflow-y-auto bg-muted/20 font-mono text-xs">
              {logsQ.data.logs.map((log) => (
                <LogLine key={log.id} log={log} />
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-border p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                {logsQ.data.total > 0
                  ? `Showing ${(logsQ.data.page - 1) * logsQ.data.pageSize + 1}–${Math.min(
                      logsQ.data.page * logsQ.data.pageSize,
                      logsQ.data.total
                    )} of ${logsQ.data.total}`
                  : "0 logs"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={logsQ.data.page <= 1 || logsQ.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <span className="min-w-[90px] text-center">
                  Page {logsQ.data.page} of {Math.max(1, Math.ceil(logsQ.data.total / logsQ.data.pageSize))}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={logsQ.data.page * logsQ.data.pageSize >= logsQ.data.total || logsQ.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function LogLine({ log }: { log: AdminLog }) {
  const accent =
    log.level === "error"
      ? "border-l-red-500 bg-red-500/[0.03]"
      : log.level === "warn"
        ? "border-l-amber-500 bg-amber-500/[0.03]"
        : "border-l-brand/40 bg-card";

  return (
    <div className={cn("flex items-start gap-3 border-l-2 px-3 py-1.5", accent)}>
      <span className="shrink-0 text-muted-foreground/70">{fmtDateTime(log.createdAt)}</span>
      <LevelBadge level={log.level} />
      <span className="shrink-0 text-[var(--brand)]">[{log.source}]</span>
      <span className="flex-1 break-words text-foreground/90">{log.message}</span>
      {log.meta && (
        <span className="shrink-0 max-w-[40%] truncate text-muted-foreground/70" title={log.meta}>
          {log.meta}
        </span>
      )}
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  if (level === "error") {
    return (
      <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-500 uppercase">
        err
      </Badge>
    );
  }
  if (level === "warn") {
    return (
      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 uppercase">
        warn
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-muted uppercase text-muted-foreground">
      info
    </Badge>
  );
}
