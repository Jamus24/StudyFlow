"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { PanelHeader, EmptyState } from "@/components/app/panel-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LifeBuoy,
  MoreHorizontal,
  Mail,
  Clock,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import {
  useAdminTickets,
  type AdminTicket,
  ForbiddenState,
  ErrorState,
  isForbidden,
  timeAgo,
  fmtDateTime,
  initialsOf,
} from "../lib";
import { cn } from "@/lib/utils";

type Filter = "all" | "open" | "pending" | "resolved" | "closed";

export function AdminTickets() {
  const { pushToast } = useUI();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const ticketsQ = useAdminTickets();

  const patchMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; priority?: string } }) =>
      api<{ ticket: AdminTicket }>(`/api/admin/tickets/${id}`, { method: "PATCH", json: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      pushToast({ title: "Ticket updated", variant: "success" });
    },
    onError: (e: Error) =>
      pushToast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const list = ticketsQ.data?.tickets ?? [];
    if (filter === "all") return list;
    return list.filter((t) => t.status === filter);
  }, [ticketsQ.data, filter]);

  const counts = useMemo(() => {
    const list = ticketsQ.data?.tickets ?? [];
    return {
      all: list.length,
      open: list.filter((t) => t.status === "open").length,
      pending: list.filter((t) => t.status === "pending").length,
      resolved: list.filter((t) => t.status === "resolved").length,
      closed: list.filter((t) => t.status === "closed").length,
    };
  }, [ticketsQ.data]);

  const activeTicket = filtered.find((t) => t.id === activeId) || ticketsQ.data?.tickets.find((t) => t.id === activeId) || null;

  if (ticketsQ.error && isForbidden(ticketsQ.error)) {
    return (
      <div>
        <PanelHeader title="Support tickets" description="Help students get unstuck" icon={LifeBuoy} />
        <ForbiddenState />
      </div>
    );
  }
  if (ticketsQ.error) {
    return (
      <div>
        <PanelHeader title="Support tickets" description="Help students get unstuck" icon={LifeBuoy} />
        <ErrorState message={(ticketsQ.error as Error).message} onRetry={() => ticketsQ.refetch()} />
      </div>
    );
  }

  return (
    <div>
      <PanelHeader title="Support tickets" description="Help students get unstuck" icon={LifeBuoy} />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All · {counts.all}</TabsTrigger>
          <TabsTrigger value="open">Open · {counts.open}</TabsTrigger>
          <TabsTrigger value="pending">Pending · {counts.pending}</TabsTrigger>
          <TabsTrigger value="resolved">Resolved · {counts.resolved}</TabsTrigger>
          <TabsTrigger value="closed">Closed · {counts.closed}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="mt-4 overflow-hidden p-0">
        {ticketsQ.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="relative h-14 overflow-hidden rounded-lg bg-muted/40">
                <div className="skeleton-shimmer absolute inset-0" />
              </div>
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="p-4">
            <EmptyState
              icon={LifeBuoy}
              title="Nothing in this view"
              description={
                filter === "all"
                  ? "No support tickets have been filed yet. When students write in, they'll appear here."
                  : `No tickets are currently ${filter}. Try another tab.`
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Subject</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => setActiveId(t.id)}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot(t.priority))} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">{preview(t.body)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-accent text-[10px] font-semibold">
                          {initialsOf(t.user?.name || undefined)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{t.user?.name || "Unknown"}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{t.user?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={t.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Actions for ${t.subject}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Update ticket</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setActiveId(t.id)}>
                          <ArrowUpRight className="mr-2 h-4 w-4" /> View full
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: t.id, data: { status: "open" } })}>Open</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: t.id, data: { status: "pending" } })}>Pending</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: t.id, data: { status: "resolved" } })}>Resolved</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: t.id, data: { status: "closed" } })}>Closed</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Priority</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: t.id, data: { priority: "low" } })}>Low</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: t.id, data: { priority: "normal" } })}>Normal</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: t.id, data: { priority: "high" } })}>High</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: t.id, data: { priority: "urgent" } })}>Urgent</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Sheet open={!!activeId} onOpenChange={(o) => !o && setActiveId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          {activeTicket && (
            <>
              <SheetHeader>
                <SheetDescription className="flex items-center gap-2 text-xs">
                  <PriorityBadge priority={activeTicket.priority} />
                  <StatusBadge status={activeTicket.status} />
                </SheetDescription>
                <SheetTitle className="font-display text-lg">{activeTicket.subject}</SheetTitle>
                <SheetDescription className="text-xs">
                  Opened {fmtDateTime(activeTicket.createdAt)} · {timeAgo(activeTicket.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex items-center gap-3 border-b border-border px-4 pb-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-accent text-xs font-semibold">
                    {initialsOf(activeTicket.user?.name || undefined)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{activeTicket.user?.name || "Unknown user"}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {activeTicket.user?.email}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    window.location.href = `mailto:${activeTicket.user?.email}?subject=Re: ${encodeURIComponent(activeTicket.subject)}`;
                  }}
                >
                  <Mail className="h-3.5 w-3.5" /> Reply
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {activeTicket.body}
                </div>
              </div>

              <div className="border-t border-border p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Quick actions</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchMut.mutate({ id: activeTicket.id, data: { status: "pending" } })}
                  >
                    <Clock className="h-3.5 w-3.5" /> Pending
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchMut.mutate({ id: activeTicket.id, data: { status: "resolved" } })}
                  >
                    Mark resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchMut.mutate({ id: activeTicket.id, data: { status: "closed" } })}
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500"
                    onClick={() => patchMut.mutate({ id: activeTicket.id, data: { priority: "urgent" } })}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Flag urgent
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function preview(body: string): string {
  const t = body.replace(/\s+/g, " ").trim();
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

function priorityDot(p: string): string {
  if (p === "urgent") return "bg-red-500";
  if (p === "high") return "bg-amber-500";
  return "bg-muted-foreground/50";
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "urgent") {
    return <Badge className="border-red-500/30 bg-red-500/10 text-red-500 capitalize">{priority}</Badge>;
  }
  if (priority === "high") {
    return <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-500 capitalize">{priority}</Badge>;
  }
  return <Badge variant="secondary" className="capitalize">{priority}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "open"
      ? "border-brand/20 bg-brand/10 text-brand"
      : status === "pending"
        ? "border-[var(--gold)]/30 bg-[var(--gold)]/15 text-[var(--gold)]"
        : status === "resolved"
          ? "border-brand/20 bg-brand/10 text-brand"
          : "border-border bg-muted text-muted-foreground";
  return <Badge variant="outline" className={cn("capitalize", cls)}>{status}</Badge>;
}
