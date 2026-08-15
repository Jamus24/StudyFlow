"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export function NotificationsMenu() {
  const qc = useQueryClient();
  const setAppRoute = useUI((s) => s.setAppRoute);
  const { data } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => (await api<{ notifications: Notification[] }>("/api/notifications")).notifications,
    refetchInterval: 45_000,
  });
  const unread = data?.filter((n) => !n.read).length ?? 0;

  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });
  const readAll = useMutation({
    mutationFn: () => api("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="ring-focus relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-brand-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button onClick={() => readAll.mutate()} className="text-xs text-muted-foreground hover:text-foreground">
              <CheckCheck className="mr-1 inline h-3.5 w-3.5" />Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="h-[320px]">
          <div className="divide-y divide-border">
            <AnimatePresence>
              {data?.length ? (
                data.slice(0, 20).map((n) => (
                  <motion.button
                    key={n.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => { markRead.mutate(n.id); if (n.link) setAppRoute(n.link as any); }}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60", !n.read && "bg-accent/30")}
                  >
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Bell className="mx-auto mb-2 h-5 w-5 opacity-40" />
                  You're all caught up.
                </div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
