"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI, useAuthStore } from "@/lib/store";
import { PanelHeader, EmptyState, LoadingBlock } from "../panel-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  UsersRound, Plus, Copy, Check, ArrowLeft, Crown, Clock, Flame,
  UserPlus, LogOut, Share2, Trophy, MessageCircle, Send, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  inviteCode: string;
  isPublic: boolean;
  role?: string;
  memberCount: number;
  createdAt: string;
}

interface GroupMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  planTier: string;
  role: string;
  minutes: number;
  isYou: boolean;
}

interface GroupDetail {
  group: Omit<Group, "role" | "memberCount" | "createdAt"> & { createdAt: string };
  members: GroupMember[];
  myRole: string;
}

const PRESET_COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#10b981", "#f97316"];

export { GroupsPanel as default };

function GroupsPanel() {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const { data, isLoading } = useQuery<{ groups: Group[] }>({
    queryKey: ["/api/groups"],
    queryFn: () => api("/api/groups"),
  });

  if (selectedId) {
    return <GroupDetailPanel groupId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const groups = data?.groups ?? [];

  return (
    <div>
      <PanelHeader
        title="Study Groups"
        description="Study with friends, compare progress, stay accountable"
        icon={UsersRound}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setJoinOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" /> Join
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <LoadingBlock key={i} className="h-40" />)}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No study groups yet"
          description="Create a group and invite study partners with a shareable code, or join one with a code."
          action={{ label: "Create a group", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {groups.map((g, i) => (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <GroupCard group={g} onOpen={() => setSelectedId(g.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinGroupDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}

function GroupCard({ group, onOpen }: { group: Group; onOpen: () => void }) {
  const pushToast = useUI((s) => s.pushToast);
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    pushToast({ title: "Code copied", description: group.inviteCode, variant: "success" });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="card-hover group relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ background: group.color }} />
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: group.color }}>
          <UsersRound className="h-5 w-5" />
        </div>
        {group.role === "owner" && (
          <Badge variant="outline" className="rounded-md text-[9px]">
            <Crown className="mr-1 h-2.5 w-2.5 text-amber-500" /> Owner
          </Badge>
        )}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold">{group.name}</h3>
      {group.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{group.description}</p>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <UsersRound className="h-3 w-3" /> {group.memberCount}
        </span>
        <span className="font-mono">{group.inviteCode}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1 gap-1.5" onClick={onOpen}>
          Open <ArrowLeft className="h-3 w-3 rotate-180" />
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={copyCode}>
          {copied ? <Check className="h-3 w-3 text-blue-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    </Card>
  );
}

function GroupDetailPanel({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<GroupDetail>({
    queryKey: ["/api/groups", groupId],
    queryFn: () => api(`/api/groups/${groupId}`),
  });

  const leave = useMutation({
    mutationFn: () => api(`/api/groups/${groupId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups"] });
      pushToast({ title: "Left group" });
      onBack();
    },
  });

  if (isLoading || !data) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <LoadingBlock className="h-96" />
      </div>
    );
  }

  const g = data.group;
  const members = data.members;
  const topMember = members[0];
  const myEntry = members.find((m) => m.isYou);

  function copyCode() {
    navigator.clipboard.writeText(g.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to groups
      </Button>

      <PanelHeader
        title={g.name}
        description={g.description || "Study group"}
        icon={UsersRound}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => leave.mutate()}>
            <LogOut className="h-3.5 w-3.5" /> {data.myRole === "owner" ? "Delete group" : "Leave group"}
          </Button>
        }
      />

      {/* invite code card */}
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ background: g.color }} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Invite code</p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-widest">{g.inviteCode}</p>
            <p className="mt-1 text-xs text-muted-foreground">Share this code with study partners</p>
          </div>
          <Button variant="outline" className="gap-1.5" onClick={copyCode}>
            {copied ? <Check className="h-4 w-4 text-blue-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy code"}
          </Button>
        </div>
      </Card>

      {/* group leaderboard */}
      <Card className="mt-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-brand" />
            <h3 className="font-display text-sm font-semibold">Group leaderboard</h3>
          </div>
          <Badge variant="secondary" className="rounded-md text-[10px]">This week</Badge>
        </div>

        {members.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {members.map((m, i) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                    m.isYou ? "border-brand/30 bg-brand/5" : "border-border bg-card"
                  )}
                >
                  <span className={cn("w-7 shrink-0 text-center font-mono text-sm font-semibold tabular-nums", i === 0 ? "text-amber-500" : "text-muted-foreground")}>
                    {i + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.avatarUrl || undefined} />
                    <AvatarFallback className="bg-accent text-xs font-semibold">{m.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", m.isYou && "text-brand")}>
                      {m.isYou ? "You" : m.name}
                    </p>
                    {m.role === "owner" && (
                      <p className="text-[10px] text-amber-500">Owner</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-sm tabular-nums">{fmtMin(m.minutes)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      <GroupGoals groupId={g.id} canManage={data.myRole === "owner" || data.myRole === "admin"} />
      <GroupChat groupId={g.id} />
    </div>
  );
}

function GroupGoals({ groupId, canManage }: { groupId: string; canManage: boolean }) {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", targetMin: 600 });

  const { data, isLoading } = useQuery<{ goals: any[] }>({
    queryKey: ["/api/groups", groupId, "goals"],
    queryFn: () => api(`/api/groups/${groupId}/goals`),
  });

  const create = useMutation({
    mutationFn: () => api(`/api/groups/${groupId}/goals`, { method: "POST", json: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "goals"] });
      pushToast({ title: "Group goal created", variant: "success" });
      setOpen(false);
      setForm({ title: "", targetMin: 600 });
    },
    onError: (e: any) => pushToast({ title: "Could not create", description: e.message, variant: "destructive" }),
  });

  const goals = data?.goals ?? [];

  return (
    <Card className="mt-4 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-brand" />
          <h3 className="font-display text-sm font-semibold">Group goals</h3>
          {goals.length > 0 && (
            <Badge variant="secondary" className="rounded-md text-[9px]">{goals.length}</Badge>
          )}
        </div>
        {canManage && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New goal
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="relative h-16 overflow-hidden rounded-lg border border-border bg-muted/30">
              <div className="skeleton-shimmer absolute inset-0" />
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
          <Target className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No active group goals.</p>
          {canManage && <p className="text-xs text-muted-foreground/70">Set a collective target to motivate the group.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {goals.map((g: any) => {
              const reached = g.pct >= 100;
              const daysLeft = Math.max(0, Math.ceil((new Date(g.periodEnd).getTime() - Date.now()) / 864e5));
              return (
                <motion.div
                  key={g.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-xl border border-border bg-card p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{g.title}</span>
                    {reached ? (
                      <Badge className="rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px]">
                        <Check className="mr-1 h-2.5 w-2.5" /> Reached
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {daysLeft === 0 ? "Ends today" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-[var(--gold)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${g.pct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {fmtMin(g.minutesStudied)}/{fmtMin(g.targetMin)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {g.memberCount} members contributing · {g.pct}%
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogTitle className="font-display text-lg font-semibold">New group goal</DialogTitle>
          <p className="text-sm text-muted-foreground">A collective target for all members this week.</p>
          <div className="mt-4 space-y-4">
            <div>
              <Label className="mb-1.5 text-xs font-medium">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. 10 hours of orgo practice"
                className="h-10"
              />
            </div>
            <div>
              <Label className="mb-1.5 flex items-center justify-between text-xs font-medium">
                <span>Target minutes (group total)</span>
                <span className="font-mono text-brand">{fmtMin(form.targetMin)}</span>
              </Label>
              <Input
                type="range" min={120} max={2000} step={60}
                value={form.targetMin}
                onChange={(e) => setForm({ ...form, targetMin: Number(e.target.value) })}
                className="h-2 cursor-pointer p-0"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>2h</span><span>17h</span><span>33h</span>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.title.trim() || create.isPending} onClick={() => create.mutate()} className="gap-1.5">
              {create.isPending ? "Creating..." : "Create goal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function GroupChat({ groupId }: { groupId: string }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ messages: any[] }>({
    queryKey: ["/api/groups", groupId, "messages"],
    queryFn: () => api(`/api/groups/${groupId}/messages`),
    refetchInterval: 8_000, // poll for new messages
  });

  const messages = data?.messages ?? [];

  // auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await api(`/api/groups/${groupId}/messages`, {
        method: "POST",
        json: { content: input.trim() },
      });
      setInput("");
      // immediate refetch
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "messages"] });
    } catch (e: any) {
      useUI.getState().pushToast({ title: "Could not send", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Card className="mt-4 p-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <MessageCircle className="h-4 w-4 text-brand" />
        <h3 className="font-display text-sm font-semibold">Group chat</h3>
        <Badge variant="secondary" className="rounded-md text-[9px]">{messages.length}</Badge>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" /> Live
        </span>
      </div>
      <div ref={scrollRef} className="max-h-80 min-h-48 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative h-12 overflow-hidden rounded-lg bg-muted/30">
                <div className="skeleton-shimmer absolute inset-0" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <MessageCircle className="mb-2 h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No messages yet.</p>
            <p className="text-xs text-muted-foreground/70">Start the conversation.</p>
          </div>
        ) : (
          messages.map((m: any) => {
            const isMe = m.user.id === user?.id;
            return (
              <div key={m.id} className={cn("flex gap-2.5", isMe && "flex-row-reverse")}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={m.user.avatarUrl || undefined} />
                  <AvatarFallback className="bg-accent text-[10px] font-semibold">{m.user.name[0]}</AvatarFallback>
                </Avatar>
                <div className={cn("min-w-0 max-w-[75%]", isMe && "items-end flex flex-col")}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">{isMe ? "You" : m.user.name}</span>
                    <span className="text-[9px] text-muted-foreground">{timeAgo(m.createdAt)}</span>
                  </div>
                  <div className={cn(
                    "mt-0.5 rounded-2xl px-3 py-2 text-sm",
                    isMe
                      ? "bg-brand text-brand-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message your study group…"
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-brand"
          maxLength={2000}
        />
        <Button size="icon" className="h-10 w-10 shrink-0" onClick={send} disabled={!input.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "", color: PRESET_COLORS[0], isPublic: false });

  const create = useMutation({
    mutationFn: () => api("/api/groups", { method: "POST", json: form }),
    onSuccess: (g: any) => {
      qc.invalidateQueries({ queryKey: ["/api/groups"] });
      pushToast({ title: "Group created", description: `Invite code: ${g.group.inviteCode}`, variant: "success" });
      onOpenChange(false);
      setForm({ name: "", description: "", color: PRESET_COLORS[0], isPublic: false });
    },
    onError: (e: any) => pushToast({ title: "Could not create", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogTitle className="font-display text-lg font-semibold">Create a study group</DialogTitle>
        <p className="text-sm text-muted-foreground">Study with friends and compare weekly progress.</p>
        <div className="mt-4 space-y-4">
          <div>
            <Label className="mb-1.5 text-xs font-medium">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Orgo Study Squad" className="h-10" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-medium">Description (optional)</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's this group for?" rows={2} className="resize-none" />
          </div>
          <div>
            <Label className="mb-2 text-xs font-medium">Color</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn("h-8 w-8 rounded-lg transition-transform", form.color === c && "ring-2 ring-offset-2 ring-offset-background scale-110")}
                  style={{ background: c, boxShadow: form.color === c ? `0 0 0 2px ${c}` : "none" }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!form.name.trim() || create.isPending} onClick={() => create.mutate()} className="gap-1.5">
            {create.isPending ? "Creating..." : "Create group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JoinGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();
  const [code, setCode] = useState("");

  const join = useMutation({
    mutationFn: () => api("/api/groups/join", { method: "POST", json: { inviteCode: code } }),
    onSuccess: (g: any) => {
      qc.invalidateQueries({ queryKey: ["/api/groups"] });
      pushToast({ title: "Joined group", description: g.group.name, variant: "success" });
      onOpenChange(false);
      setCode("");
    },
    onError: (e: any) => pushToast({ title: "Could not join", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogTitle className="font-display text-lg font-semibold">Join a study group</DialogTitle>
        <p className="text-sm text-muted-foreground">Enter the 6-character invite code.</p>
        <div className="mt-4">
          <Label className="mb-1.5 text-xs font-medium">Invite code</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="h-12 text-center font-mono text-xl tracking-[0.3em]"
            maxLength={6}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={code.length !== 6 || join.isPending} onClick={() => join.mutate()} className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> {join.isPending ? "Joining..." : "Join"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function fmtMin(m: number) {
  if (!m) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
