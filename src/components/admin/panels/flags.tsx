"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { PanelHeader, EmptyState, LoadingBlock } from "@/components/app/panel-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Flag, Plus, MoreVertical, Pencil, Trash2, Globe } from "lucide-react";
import {
  useAdminFlags,
  type AdminFlag,
  ForbiddenState,
  ErrorState,
  isForbidden,
  fmtDateTime,
  useDebounced,
} from "../lib";

export function AdminFlags() {
  const { pushToast } = useUI();
  const qc = useQueryClient();
  const flagsQ = useAdminFlags();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/admin/flags"] });

  const patchMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminFlag> }) =>
      api<{ flag: AdminFlag }>(`/api/admin/flags/${id}`, { method: "PATCH", json: data }),
    onSuccess: () => {
      invalidate();
      pushToast({ title: "Flag updated", variant: "success" });
    },
    onError: (e: Error) =>
      pushToast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/api/admin/flags/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      pushToast({ title: "Flag deleted", variant: "success" });
    },
    onError: (e: Error) =>
      pushToast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const [newOpen, setNewOpen] = useState(false);
  const [editFlag, setEditFlag] = useState<AdminFlag | null>(null);
  const [deleteFlag, setDeleteFlag] = useState<AdminFlag | null>(null);

  if (flagsQ.error && isForbidden(flagsQ.error)) {
    return (
      <div>
        <PanelHeader title="Feature flags" description="Roll out features safely" icon={Flag} />
        <ForbiddenState />
      </div>
    );
  }
  if (flagsQ.error) {
    return (
      <div>
        <PanelHeader title="Feature flags" description="Roll out features safely" icon={Flag} />
        <ErrorState message={(flagsQ.error as Error).message} onRetry={() => flagsQ.refetch()} />
      </div>
    );
  }

  return (
    <div>
      <PanelHeader
        title="Feature flags"
        description="Roll out features safely"
        icon={Flag}
        actions={
          <Button className="gap-2" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> New flag
          </Button>
        }
      />

      {flagsQ.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <LoadingBlock key={i} className="h-44" />
          ))}
        </div>
      ) : !flagsQ.data?.flags.length ? (
        <EmptyState
          icon={Flag}
          title="No feature flags yet"
          description="Create your first flag to gate a feature for a subset of users."
          action={{ label: "Create flag", onClick: () => setNewOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {flagsQ.data.flags.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              onToggle={(enabled) => patchMut.mutate({ id: flag.id, data: { enabled } })}
              onRollout={(rollout) => patchMut.mutate({ id: flag.id, data: { rollout } })}
              onEdit={() => setEditFlag(flag)}
              onDelete={() => setDeleteFlag(flag)}
              saving={patchMut.isPending}
            />
          ))}
        </div>
      )}

      <FlagFormDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSubmit={async (data) => {
          try {
            await api(`/api/admin/flags`, { method: "POST", json: data });
            invalidate();
            pushToast({ title: "Flag created", description: `${data.label} is now available.`, variant: "success" });
            setNewOpen(false);
          } catch (e) {
            pushToast({ title: "Create failed", description: (e as Error).message, variant: "destructive" });
          }
        }}
      />

      <FlagFormDialog
        open={!!editFlag}
        flag={editFlag || undefined}
        onOpenChange={(o) => !o && setEditFlag(null)}
        onSubmit={async (data) => {
          if (!editFlag) return;
          try {
            await api(`/api/admin/flags/${editFlag.id}`, { method: "PATCH", json: data });
            invalidate();
            pushToast({ title: "Flag updated", variant: "success" });
            setEditFlag(null);
          } catch (e) {
            pushToast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
          }
        }}
      />

      <AlertDialog open={!!deleteFlag} onOpenChange={(o) => !o && setDeleteFlag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete flag &quot;{deleteFlag?.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              The flag and its rollout config will be removed. Any code gated on this key will fall back to its default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteFlag && deleteMut.mutate(deleteFlag.id)}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete flag"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FlagCard({
  flag,
  onToggle,
  onRollout,
  onEdit,
  onDelete,
  saving,
}: {
  flag: AdminFlag;
  onToggle: (enabled: boolean) => void;
  onRollout: (rollout: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [rollout, setRollout] = useState(flag.rollout);
  const debounced = useDebounced(rollout, 500);

  useEffect(() => {
    if (debounced !== flag.rollout) {
      onRollout(debounced);
    }
  }, [debounced]);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold">{flag.label}</h3>
            {flag.enabled ? (
              <Badge className="border-brand/20 bg-brand/10 text-brand">Live</Badge>
            ) : (
              <Badge variant="secondary">Off</Badge>
            )}
          </div>
          <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {flag.key}
          </code>
          {flag.description && (
            <p className="mt-2 text-xs text-muted-foreground">{flag.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Flag actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
        <div>
          <p className="text-sm font-medium">Enabled</p>
          <p className="text-xs text-muted-foreground">
            {flag.enabled ? "On for everyone in the rollout window." : "Off – defaults apply."}
          </p>
        </div>
        <Switch
          checked={flag.enabled}
          onCheckedChange={onToggle}
          disabled={saving}
          aria-label={`Toggle ${flag.label}`}
        />
      </div>

      <div className="mt-3 rounded-lg border border-border bg-card px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Rollout</p>
          <span className="font-mono text-sm font-semibold text-foreground">{rollout}%</span>
        </div>
        <Slider
          value={[rollout]}
          onValueChange={(v) => setRollout(v[0] ?? 0)}
          min={0}
          max={100}
          step={5}
          aria-label={`${flag.label} rollout percentage`}
        />
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> 0% · off</span>
          <span>100% · all users</span>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">Created {fmtDateTime(flag.createdAt)}</p>
    </Card>
  );
}

interface FlagFormData {
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
  rollout: number;
}

function FlagFormDialog({
  open,
  onOpenChange,
  onSubmit,
  flag,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: FlagFormData) => Promise<void> | void;
  flag?: AdminFlag;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <FlagForm
          key={flag?.id || "new"}
          flag={flag}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

function FlagForm({
  flag,
  onCancel,
  onSubmit,
}: {
  flag?: AdminFlag;
  onCancel: () => void;
  onSubmit: (data: FlagFormData) => Promise<void> | void;
}) {
  const [key, setKey] = useState(flag?.key ?? "");
  const [label, setLabel] = useState(flag?.label ?? "");
  const [description, setDescription] = useState(flag?.description ?? "");
  const [enabled, setEnabled] = useState(flag?.enabled ?? false);
  const [rollout, setRollout] = useState(flag?.rollout ?? 0);
  const [saving, setSaving] = useState(false);

  const valid = key.trim().length > 1 && label.trim().length > 1;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    try {
      await onSubmit({
        key: key.trim(),
        label: label.trim(),
        description: description.trim() || undefined,
        enabled,
        rollout,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{flag ? "Edit flag" : "New feature flag"}</DialogTitle>
        <DialogDescription>
          Gate a feature behind a key and ramp rollout from 0 to 100%.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="flag-label">Label</Label>
          <Input
            id="flag-label"
            placeholder="AI Tutor v2"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="flag-key">Key</Label>
          <Input
            id="flag-key"
            placeholder="ai_tutor_v2"
            value={key}
            onChange={(e) => setKey(e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())}
            className="font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            Used in code as <code className="font-mono">isFlagEnabled(&quot;{key || "key"}&quot;)</code>
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="flag-desc">Description (optional)</Label>
          <Textarea
            id="flag-desc"
            placeholder="Ramp the new tutor UI to Pro and Scholar users first."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Enabled</p>
            <p className="text-xs text-muted-foreground">Master switch – overrides rollout when off.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Flag enabled" />
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <Label>Rollout</Label>
            <span className="font-mono text-sm font-semibold">{rollout}%</span>
          </div>
          <Slider value={[rollout]} onValueChange={(v) => setRollout(v[0] ?? 0)} min={0} max={100} step={5} aria-label="Rollout percentage" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button disabled={!valid || saving} onClick={submit}>
          {saving ? "Saving…" : flag ? "Save changes" : "Create flag"}
        </Button>
      </DialogFooter>
    </>
  );
}
