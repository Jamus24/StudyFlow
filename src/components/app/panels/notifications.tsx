"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CheckSquare, Sparkles, Info, CreditCard, Users,
  CheckCheck, Inbox,
} from "lucide-react";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { PanelHeader, LoadingBlock, EmptyState } from "../panel-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, { Icon: any; color: string }> = {
  task: { Icon: CheckSquare, color: "#2563eb" },
  plan: { Icon: Sparkles, color: "#f59e0b" },
  system: { Icon: Info, color: "#8b5cf6" },
  billing: { Icon: CreditCard, color: "#ef4444" },
  social: { Icon: Users, color: "#06b6d4" },
};

const reduce =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// notifications panel v2
export function NotificationsPanel() {
  const qc = useQueryClient();
  const setAppRoute = useUI((s) => s.setAppRoute);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading } = useQuery<{ notifications: Notification[]; unread: number }>({
    queryKey: ["/api/notifications"],
    queryFn: () => api("/api/notifications"),
    refetchInterval: 45_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });
  const readAll = useMutation({
    mutationFn: () => api("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const items = useMemo(() => {
    const notifs = data?.notifications;
    if (!Array.isArray(notifs)) return [];
    return filter === "unread" ? notifs.filter((n) => !n.read) : notifs;
  }, [data, filter]);

  const unread = data?.unread ?? 0;

  const notifCount = (data && Array.isArray(data.notifications)) ? data.notifications.length : 0;

  return (
    <div>
      <PanelHeader
        title="Notifications"
        description="Stay on top of what matters"
        icon={Bell}
        actions={
          unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending}
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : null
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-none">
            All
            <Badge variant="secondary" className="ml-1.5 rounded-md text-[10px]">
              {notifCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex-1 sm:flex-none">
            Unread
            <Badge variant="secondary" className="ml-1.5 rounded-md bg-brand/15 text-brand text-[10px]">
              {unread}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <Card className="overflow-hidden p-0">
            {isLoading ? (
              <div className="space-y-px bg-border/40">
                {Array.from({ length: 6 }).map((_, i) => (
                  <LoadingBlock key={i} className="h-16 rounded-none" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-2">
                <EmptyState
                  icon={Inbox}
                  title={filter === "unread" ? "No unread notifications" : "You're all caught up"}
                  description="New tasks, plans, and billing updates will appear here. We keep it tidy – never spammy."
                />
              </div>
            ) : (
              <ScrollArea className="max-h-[640px]">
                <div className="divide-y divide-border">
                  <AnimatePresence initial={false}>
                    {items.map((n) => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        onMark={() => markRead.mutate(n.id)}
                        onOpen={() => {
                          markRead.mutate(n.id);
                          if (n.link) setAppRoute(n.link as any);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationRow({
  n, onMark, onOpen,
}: {
  n: Notification;
  onMark: () => void;
  onOpen: () => void;
}) {
  const { Icon, color } = TYPE_ICON[n.type] ?? TYPE_ICON.system;
  return (
    <motion.div
      layout
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group relative flex gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40",
        !n.read && "bg-accent/20"
      )}
    >
      {/* unread bar */}
      {!n.read && <span className="absolute left-0 top-0 h-full w-0.5 bg-brand" />}

      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${color}1a`, color }}
      >
        <Icon className="h-4 w-4" />
      </div>

      <button
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
        aria-label={`${n.title} – open`}
      >
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-medium">{n.title}</p>
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
            {timeAgo(n.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
        {n.link && (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand">
            Open →
          </span>
        )}
      </button>

      {!n.read && (
        <button
          onClick={onMark}
          className="ring-focus absolute right-3 top-3 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Mark as read"
          title="Mark as read"
        >
          <CheckCheck className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export { NotificationsPanel as default };
