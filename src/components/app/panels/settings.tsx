"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  Settings, User, SlidersHorizontal, Palette, AlertTriangle,
  Camera, Check, Download, Trash2, Loader2, Sparkles, Moon, Sun, Monitor,
} from "lucide-react";
import { api } from "@/lib/fetch";
import { useUI, useAuthStore, type ClientUser } from "@/lib/store";
import { PanelHeader, LoadingBlock } from "../panel-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Preferences {
  theme?: string;
  accent?: string;
  pomodoroWork?: number;
  pomodoroBreak?: number;
  emailDigest?: boolean;
  weeklyReport?: boolean;
  pushReminders?: boolean;
  reduceMotion?: boolean;
  compactDensity?: boolean;
}

interface MeResponse {
  user: (ClientUser & { createdAt?: string }) | null;
  preferences: Preferences | null;
}

const TIMEZONES = [
  "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi", "Africa/Cairo",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Sao_Paulo", "Asia/Dubai", "Asia/Kolkata",
  "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney",
  "Pacific/Auckland", "UTC",
];

const ACCENTS = [
  { id: "blue", color: "#2563eb", label: "Ocean Blue" },
  { id: "amber", color: "#f59e0b", label: "Amber" },
  { id: "coral", color: "#f97373", label: "Coral" },
  { id: "violet", color: "#8b5cf6", label: "Violet" },
  { id: "teal", color: "#06b6d4", label: "Teal" },
];

export function SettingsPanel() {
  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ["/api/auth/me", "settings"],
    queryFn: () => api<MeResponse>("/api/auth/me"),
  });

  if (isLoading || !data) {
    return (
      <div>
        <PanelHeader title="Settings" description="Make Study Flow yours" icon={Settings} />
        <div className="space-y-4">
          <LoadingBlock className="h-12" />
          <LoadingBlock className="h-96" />
        </div>
      </div>
    );
  }

  if (!data.user) {
    return (
      <div>
        <PanelHeader title="Settings" description="Make Study Flow yours" icon={Settings} />
        <Card className="p-6 text-sm text-muted-foreground">Sign in to manage settings.</Card>
      </div>
    );
  }

  return (
    <div>
      <PanelHeader title="Settings" description="Make Study Flow yours" icon={Settings} />
      <Tabs defaultValue="profile" className="gap-5">
        <TabsList className="flex w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5"><SlidersHorizontal className="h-4 w-4" /> Preferences</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5"><Palette className="h-4 w-4" /> Appearance</TabsTrigger>
          <TabsTrigger value="danger" className="gap-1.5"><AlertTriangle className="h-4 w-4" /> Danger zone</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={data.user} preferences={data.preferences ?? {}} />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesTab preferences={data.preferences ?? {}} />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceTab preferences={data.preferences ?? {}} />
        </TabsContent>
        <TabsContent value="danger">
          <DangerTab user={data.user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Profile Tab ---------------- */

function ProfileTab({ user, preferences }: { user: ClientUser & { createdAt?: string }; preferences: Preferences }) {
  const pushToast = useUI((s) => s.pushToast);
  const setUser = useAuthStore((s) => s.setUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio ?? "",
    grade: user.grade ?? "",
    timezone: user.timezone,
    weeklyGoalMin: user.weeklyGoalMin,
  });
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);

  const profileMutation = useMutation({
    mutationFn: (payload: Partial<typeof form>) =>
      api<{ user: any }>("/api/profile", { method: "PATCH", json: payload }),
    onSuccess: (r) => {
      setUser({ ...user, ...r.user } as ClientUser);
      pushToast({ title: "Profile saved", description: "Your changes are live.", variant: "success" });
    },
    onError: (e: Error) => pushToast({ title: "Could not save profile", description: e.message, variant: "destructive" }),
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body: fd, credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      return data as { avatarUrl: string };
    },
    onMutate: () => setUploading(true),
    onSuccess: (r) => {
      setAvatarUrl(r.avatarUrl);
      setUser({ ...user, avatarUrl: r.avatarUrl } as ClientUser);
      pushToast({ title: "Avatar updated", variant: "success" });
    },
    onError: (e: Error) => pushToast({ title: "Avatar upload failed", description: e.message, variant: "destructive" }),
    onSettled: () => setUploading(false),
  });

  const dirty =
    form.name !== user.name ||
    form.bio !== (user.bio ?? "") ||
    form.grade !== (user.grade ?? "") ||
    form.timezone !== user.timezone ||
    Number(form.weeklyGoalMin) !== Number(user.weeklyGoalMin);

  function handleSave() {
    if (!form.name.trim() || form.name.length < 2) {
      pushToast({ title: "Name too short", description: "Use at least 2 characters.", variant: "destructive" });
      return;
    }
    profileMutation.mutate({
      name: form.name.trim(),
      bio: form.bio.trim() || undefined,
      grade: form.grade.trim() || undefined,
      timezone: form.timezone,
      weeklyGoalMin: Number(form.weeklyGoalMin),
    });
  }

  const initials = (form.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const goalHours = Math.floor(Number(form.weeklyGoalMin) / 60);
  const goalRem = Number(form.weeklyGoalMin) % 60;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Avatar + tier */}
      <Card className="p-5 lg:col-span-1">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-2 ring-border">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={form.name} /> : null}
              <AvatarFallback className="bg-accent text-xl font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="ring-focus absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft transition-colors hover:bg-accent disabled:opacity-50"
              aria-label="Change avatar"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) avatarMutation.mutate(file);
                e.target.value = "";
              }}
            />
          </div>
          <div>
            <p className="font-display text-base font-semibold">{form.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="secondary" className="rounded-full capitalize">
            <Sparkles className="h-3 w-3" /> {user.planTier} plan
          </Badge>
          <p className="text-[11px] text-muted-foreground">
            Joined {new Date(user.createdAt ?? Date.now()).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
      </Card>

      {/* Form */}
      <Card className="p-5 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grade">Grade / year</Label>
            <Input id="grade" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. Grade 11, Undergrad Y2" maxLength={40} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A line about your studies and goals." maxLength={400} rows={3} />
            <p className="text-[10px] text-muted-foreground">{form.bio.length}/400</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tz">Timezone</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
              <SelectTrigger id="tz" className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Weekly goal</Label>
              <Badge variant="secondary" className="rounded-md font-mono text-[10px]">
                {goalHours > 0 ? `${goalHours}h ` : ""}{goalRem}m
              </Badge>
            </div>
            <Slider
              min={60}
              max={3000}
              step={15}
              value={[Number(form.weeklyGoalMin)]}
              onValueChange={(v) => setForm({ ...form, weeklyGoalMin: v[0] })}
              className="mt-3"
            />
            <p className="text-[10px] text-muted-foreground">How many minutes of focused study you aim for each week.</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2">
          <Button onClick={handleSave} disabled={profileMutation.isPending || !dirty} className="gap-2">
            {profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save changes
          </Button>
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Preferences Tab ---------------- */

function PreferencesTab({ preferences }: { preferences: Preferences }) {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<Preferences>({
    pomodoroWork: preferences.pomodoroWork ?? 25,
    pomodoroBreak: preferences.pomodoroBreak ?? 5,
    emailDigest: preferences.emailDigest ?? true,
    weeklyReport: preferences.weeklyReport ?? true,
    pushReminders: preferences.pushReminders ?? true,
    reduceMotion: preferences.reduceMotion ?? false,
    compactDensity: preferences.compactDensity ?? false,
  });

  const patchMutation = useMutation({
    mutationFn: (payload: Partial<Preferences>) =>
      api<{ preferences: Preferences }>("/api/preferences", { method: "PATCH", json: payload }),
    onSuccess: (r) => {
      setPrefs((p) => ({ ...p, ...r.preferences }));
      qc.invalidateQueries({ queryKey: ["/api/auth/me", "settings"] });
    },
    onError: (e: Error) => pushToast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  function patch<K extends keyof Preferences>(key: K, value: Preferences[K], label: string) {
    setPrefs((p) => ({ ...p, [key]: value }));
    patchMutation.mutate(
      { [key]: value },
      {
        onSuccess: () => pushToast({ title: `${label} updated`, variant: "success" }),
      }
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Pomodoro */}
      <Card className="p-5">
        <h3 className="font-display text-base font-semibold">Pomodoro timing</h3>
        <p className="text-xs text-muted-foreground">Tune your focus / break cycle.</p>

        <div className="mt-5 space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Work session</Label>
              <Badge variant="secondary" className="rounded-md font-mono text-[10px]">{prefs.pomodoroWork} min</Badge>
            </div>
            <Slider
              min={5} max={90} step={5}
              value={[prefs.pomodoroWork ?? 25]}
              onValueChange={(v) => setPrefs((p) => ({ ...p, pomodoroWork: v[0] }))}
              onValueCommit={(v) => patch("pomodoroWork", v[0], "Work session")}
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>5m</span><span>90m</span></div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Break</Label>
              <Badge variant="secondary" className="rounded-md font-mono text-[10px]">{prefs.pomodoroBreak} min</Badge>
            </div>
            <Slider
              min={1} max={30} step={1}
              value={[prefs.pomodoroBreak ?? 5]}
              onValueChange={(v) => setPrefs((p) => ({ ...p, pomodoroBreak: v[0] }))}
              onValueCommit={(v) => patch("pomodoroBreak", v[0], "Break")}
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>1m</span><span>30m</span></div>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-5">
        <h3 className="font-display text-base font-semibold">Notifications & digest</h3>
        <p className="text-xs text-muted-foreground">What we ping you about, and how often.</p>
        <div className="mt-4 space-y-3">
          <ToggleRow
            label="Email digest"
            description="A short daily summary of what's due."
            checked={prefs.emailDigest ?? true}
            onToggle={(v) => patch("emailDigest", v, "Email digest")}
          />
          <ToggleRow
            label="Weekly report"
            description="Study Flow's AI review every Sunday."
            checked={prefs.weeklyReport ?? true}
            onToggle={(v) => patch("weeklyReport", v, "Weekly report")}
          />
          <ToggleRow
            label="Push reminders"
            description="In-browser nudges for scheduled tasks."
            checked={prefs.pushReminders ?? true}
            onToggle={(v) => patch("pushReminders", v, "Push reminders")}
          />
        </div>
      </Card>

      {/* Accessibility */}
      <Card className="p-5 lg:col-span-2">
        <h3 className="font-display text-base font-semibold">Accessibility & layout</h3>
        <p className="text-xs text-muted-foreground">Tune the interface to your comfort.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ToggleRow
            label="Reduce motion"
            description="Minimise animations and transitions."
            checked={prefs.reduceMotion ?? false}
            onToggle={(v) => patch("reduceMotion", v, "Reduce motion")}
          />
          <ToggleRow
            label="Compact density"
            description="Tighter spacing for more on screen."
            checked={prefs.compactDensity ?? false}
            onToggle={(v) => patch("compactDensity", v, "Compact density")}
          />
        </div>
      </Card>
    </div>
  );
}

function ToggleRow({
  label, description, checked, onToggle, disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/50 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} aria-label={label} />
    </div>
  );
}

/* ---------------- Appearance Tab ---------------- */

function AppearanceTab({ preferences }: { preferences: Preferences }) {
  const { theme, setTheme } = useTheme();
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();
  const [accent, setAccent] = useState(preferences.accent ?? "blue");

  const patchMutation = useMutation({
    mutationFn: (payload: Partial<Preferences>) =>
      api<{ preferences: Preferences }>("/api/preferences", { method: "PATCH", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/auth/me", "settings"] }),
    onError: (e: Error) => pushToast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  function selectTheme(t: "light" | "dark" | "system") {
    setTheme(t);
    patchMutation.mutate(
      { theme: t },
      { onSuccess: () => pushToast({ title: `Theme set to ${t}`, variant: "success" }) }
    );
  }

  function selectAccent(id: string, color: string) {
    setAccent(id);
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--brand", color);
    }
    patchMutation.mutate(
      { accent: id },
      { onSuccess: () => pushToast({ title: `Accent set to ${id}`, variant: "success" }) }
    );
  }

  const themes: { id: "light" | "dark" | "system"; label: string; icon: any }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="font-display text-base font-semibold">Theme</h3>
        <p className="text-xs text-muted-foreground">Light, dark, or follow your system.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const active = (theme ?? "system") === t.id;
            return (
              <button
                key={t.id}
                onClick={() => selectTheme(t.id)}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:border-foreground/15",
                  active ? "border-brand bg-accent/40 ring-1 ring-brand/30" : "border-border bg-card"
                )}
                aria-pressed={active}
              >
                <div className={cn(
                  "flex h-12 w-full items-center justify-center rounded-lg border",
                  t.id === "light" && "border-amber-200 bg-amber-50 text-amber-700",
                  t.id === "dark" && "border-blue-900 bg-blue-950 text-blue-300",
                  t.id === "system" && "border-border bg-gradient-to-br from-amber-50 to-blue-950 text-foreground"
                )}>
                  <t.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{t.label}</span>
                {active && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-brand-foreground">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-display text-base font-semibold">Accent color</h3>
        <p className="text-xs text-muted-foreground">The colour Study Flow uses for highlights.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const active = accent === a.id;
            return (
              <button
                key={a.id}
                onClick={() => selectAccent(a.id, a.color)}
                className={cn(
                  "group flex flex-col items-center gap-1.5 transition-transform hover:scale-105",
                )}
                aria-label={`Accent: ${a.label}`}
                aria-pressed={active}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                    active ? "ring-foreground/40" : "ring-transparent"
                  )}
                  style={{ background: a.color }}
                >
                  {active && <Check className="h-5 w-5 text-white drop-shadow" />}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Danger Zone ---------------- */

function DangerTab({ user }: { user: ClientUser }) {
  const pushToast = useUI((s) => s.pushToast);
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const exportData = await api<any>("/api/export");
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lumina-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushToast({ title: "Data exported", description: `${exportData.stats?.totalTasks || 0} tasks, ${exportData.stats?.totalSessions || 0} sessions, ${exportData.stats?.totalNotes || 0} notes.`, variant: "success" });
    } catch (e: any) {
      pushToast({ title: "Export failed", description: e?.message ?? "Try again later.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-base font-semibold">Danger zone</h3>
          <p className="text-xs text-muted-foreground">Irreversible account actions. Proceed carefully.</p>

          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Export my data</p>
                <p className="text-[11px] text-muted-foreground">Download your subjects, tasks, sessions, plans and notes as JSON.</p>
              </div>
              <Button variant="outline" className="gap-2" onClick={exportData} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export JSON
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Delete account</p>
                <p className="text-[11px] text-muted-foreground">Permanently erase your Study Flow account and all its data.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Delete account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your Study Flow account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently erase every subject, task, session, plan, note and deck you've created. The action cannot be undone.
                      <br /><br />
                      Because we want to be sure, please email <span className="font-medium text-foreground">support@lumina.study</span> from the address on your account and we'll process it within 48 hours.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => pushToast({
                        title: "Email sent instructions",
                        description: "Write to support@lumina.study and we'll close your account.",
                        variant: "default",
                      })}
                    >
                      Got it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export { SettingsPanel as default };
