"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { PanelHeader } from "../panel-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Timer, Play, Pause, RotateCcw, SkipForward, Coffee, Brain, Target,
  Volume2, Bell, CheckCircle2, Flame, Zap, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export { FocusPanel as default };

type Phase = "idle" | "work" | "break" | "done";

interface Subject { id: string; name: string; color: string }

function FocusPanel() {
  const pushToast = useUI((s) => s.pushToast);
  const setAppRoute = useUI((s) => s.setAppRoute);
  const qc = useQueryClient();
  const { data: subjectsData } = useQuery<{ subjects: Subject[] }>({
    queryKey: ["/api/subjects"],
    queryFn: () => api("/api/subjects"),
  });
  const subjects = subjectsData?.subjects ?? [];

  // config
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [longBreakMin, setLongBreakMin] = useState(15);
  const [rounds, setRounds] = useState(4);
  const [autoStart, setAutoStart] = useState(false);
  const [sound, setSound] = useState(true);
  const [subjectId, setSubjectId] = useState<string>("");

  // runtime
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [currentRound, setCurrentRound] = useState(1);
  const [completedWork, setCompletedWork] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalForPhase = useCallback(() => {
    if (phase === "work") return workMin * 60;
    if (phase === "break") return (currentRound % rounds === 0 ? longBreakMin : breakMin) * 60;
    return workMin * 60;
  }, [phase, workMin, breakMin, longBreakMin, currentRound, rounds]);

  const beep = useCallback(() => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.start(); osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }, [sound]);

  // Transition to the next phase. Called from the interval callback (async,
  // not synchronous in an effect body) so it satisfies the set-state rule.
  const transitionPhase = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    beep();
    if (phase === "work") {
      const newCompleted = completedWork + 1;
      setCompletedWork(newCompleted);
      pushToast({ title: "Focus block done", description: `${workMin} min – nice. Take a break.`, variant: "success" });
      const isLastInRound = newCompleted % rounds === 0;
      setSecondsLeft((isLastInRound ? longBreakMin : breakMin) * 60);
      setPhase("break");
    } else if (phase === "break") {
      setCurrentRound(Math.floor(completedWork / rounds) + 1);
      setSecondsLeft(workMin * 60);
      setPhase("work");
      setSessionStart(new Date());
      pushToast({ title: "Break over", description: "Back to focus." });
    }
  }, [phase, completedWork, workMin, breakMin, longBreakMin, rounds, beep, pushToast]);

  // timer tick
  useEffect(() => {
    if (phase !== "work" && phase !== "break") return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          transitionPhase();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, currentRound, transitionPhase]);

  function start() {
    if (phase === "idle") {
      setPhase("work");
      setSecondsLeft(workMin * 60);
      setSessionStart(new Date());
      setCurrentRound(1);
      setCompletedWork(0);
    } else {
      setPhase(phase === "done" ? "work" : phase);
    }
  }
  function pause() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("idle");
  }
  function skip() {
    transitionPhase();
  }
  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("idle");
    setSecondsLeft(workMin * 60);
    setCurrentRound(1);
    setCompletedWork(0);
    setSessionStart(null);
  }

  // log session mutation – returns the created session so we can prompt for reflection
  const logSession = useMutation({
    mutationFn: (durationMin: number) =>
      api<{ session: { id: string } }>("/api/sessions", {
        method: "POST",
        json: {
          subjectId: subjectId || null,
          durationMin,
          mode: "pomodoro",
          note: `Round ${currentRound} · focus block`,
        },
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/streak"] });
      qc.invalidateQueries({ queryKey: ["/api/insights"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions"] });
      // prompt for reflection
      if (data?.session?.id) {
        setLastSessionId(data.session.id);
        setReflectOpen(true);
      }
    },
  });

  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [reflectOpen, setReflectOpen] = useState(false);

  // when a work block completes, log it
  useEffect(() => {
    if (completedWork > 0 && phase === "break" && sessionStart) {
      logSession.mutate(workMin);
    }
  }, [completedWork]);

  // update title with countdown
  useEffect(() => {
    if (phase === "work" || phase === "break") {
      document.title = `${fmt(secondsLeft)} · ${phase === "work" ? "Focus" : "Break"} – Study Flow`;
    } else {
      document.title = "Study Flow – AI Study Planner for Students";
    }
    return () => { document.title = "Study Flow – AI Study Planner for Students"; };
  }, [secondsLeft, phase]);

  const progress = phase === "idle" ? 0 : 1 - secondsLeft / totalForPhase();
  const isWorking = phase === "work";
  const accentColor = isWorking ? "#2563eb" : phase === "break" ? "#f59e0b" : "#94a3b8";

  const todayMinutes = completedWork * workMin;
  const circleRadius = 140;
  const circumference = 2 * Math.PI * circleRadius;

  return (
    <div>
      <PanelHeader
        title="Focus Timer"
        description="Pomodoro sessions that log straight into your subjects"
        icon={Timer}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Timer card */}
        <Card className="relative overflow-hidden p-6 sm:p-10">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-30 blur-2xl transition-colors duration-500"
            style={{ background: `radial-gradient(ellipse at center, ${accentColor}, transparent 70%)` }}
          />
          <div className="relative flex flex-col items-center">
            {/* phase badge */}
            <div className="mb-6 flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", isWorking && "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400", phase === "break" && "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400")}
              >
                {isWorking ? <><Brain className="mr-1.5 h-3 w-3" /> Focusing</> : phase === "break" ? <><Coffee className="mr-1.5 h-3 w-3" /> On break</> : <><Target className="mr-1.5 h-3 w-3" /> Ready</>}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                Round {currentRound} of {rounds}
              </Badge>
            </div>

            {/* circular timer */}
            <div className="relative">
              <motion.div
                animate={phase === "break" ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg width="320" height="320" viewBox="0 0 320 320" className="max-w-full">
                  <defs>
                    <linearGradient id="timer-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={accentColor} />
                      <stop offset="100%" stopColor="var(--gold)" />
                    </linearGradient>
                    <filter id="timer-glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {/* tick marks around the ring */}
                  {Array.from({ length: 60 }).map((_, i) => {
                    const angle = (i * 6 - 90) * (Math.PI / 180);
                    const isMajor = i % 5 === 0;
                    const r1 = circleRadius + 12;
                    const r2 = circleRadius + (isMajor ? 20 : 16);
                    const x1 = 160 + Math.cos(angle) * r1;
                    const y1 = 160 + Math.sin(angle) * r1;
                    const x2 = 160 + Math.cos(angle) * r2;
                    const y2 = 160 + Math.sin(angle) * r2;
                    return (
                      <line
                        key={i}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={isMajor ? "var(--muted-foreground)" : "var(--border)"}
                        strokeWidth={isMajor ? 1.5 : 1}
                        opacity={isMajor ? 0.5 : 0.3}
                      />
                    );
                  })}
                  {/* track */}
                  <circle cx="160" cy="160" r={circleRadius} fill="none" stroke="var(--muted)" strokeWidth="14" />
                  {/* progress with glow */}
                  <motion.circle
                    cx="160" cy="160" r={circleRadius} fill="none"
                    stroke="url(#timer-grad)" strokeWidth="14" strokeLinecap="round"
                    transform="rotate(-90 160 160)"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset: circumference * (1 - progress) }}
                    transition={{ duration: 0.5, ease: "linear" }}
                    filter="url(#timer-glow)"
                  />
                </svg>
              </motion.div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-6xl font-semibold tracking-tight tabular-nums text-foreground sm:text-7xl">
                  {fmt(secondsLeft)}
                </span>
                <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {isWorking ? "focus" : phase === "break" ? "break" : "ready"}
                </span>
              </div>
            </div>

            {/* controls */}
            <div className="mt-8 flex items-center gap-2">
              {phase === "idle" ? (
                <Button size="lg" className="h-12 gap-2 rounded-full px-7 shadow-soft" onClick={start}>
                  <Play className="h-5 w-5" /> Start focus
                </Button>
              ) : (
                <Button size="lg" variant="outline" className="h-12 gap-2 rounded-full px-7" onClick={pause}>
                  <Pause className="h-5 w-5" /> Pause
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={skip} disabled={phase === "idle"}>
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip phase</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={reset}>
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset</TooltipContent>
              </Tooltip>
            </div>

            {/* round dots */}
            <div className="mt-6 flex items-center gap-1.5">
              {Array.from({ length: rounds }).map((_, i) => {
                const filled = i < completedWork % rounds || (completedWork > 0 && completedWork % rounds === 0 && i < rounds);
                return (
                  <span
                    key={i}
                    className={cn("h-2 rounded-full transition-all duration-300", filled ? "w-6 bg-brand" : "w-2 bg-muted")}
                  />
                );
              })}
            </div>
          </div>
        </Card>

        {/* Config + stats */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" />
              <h3 className="font-display text-sm font-semibold">Session setup</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 flex items-center justify-between text-xs">
                  <span>Focus duration</span>
                  <span className="font-mono text-brand">{workMin}m</span>
                </Label>
                <Slider value={[workMin]} onValueChange={(v) => setWorkMin(v[0])} min={10} max={60} step={5} disabled={phase !== "idle"} />
              </div>
              <div>
                <Label className="mb-2 flex items-center justify-between text-xs">
                  <span>Short break</span>
                  <span className="font-mono text-brand">{breakMin}m</span>
                </Label>
                <Slider value={[breakMin]} onValueChange={(v) => setBreakMin(v[0])} min={3} max={15} step={1} disabled={phase !== "idle"} />
              </div>
              <div>
                <Label className="mb-2 flex items-center justify-between text-xs">
                  <span>Long break</span>
                  <span className="font-mono text-brand">{longBreakMin}m</span>
                </Label>
                <Slider value={[longBreakMin]} onValueChange={(v) => setLongBreakMin(v[0])} min={10} max={30} step={5} disabled={phase !== "idle"} />
              </div>
              <div>
                <Label className="mb-2 flex items-center justify-between text-xs">
                  <span>Rounds before long break</span>
                  <span className="font-mono text-brand">{rounds}</span>
                </Label>
                <Slider value={[rounds]} onValueChange={(v) => setRounds(v[0])} min={2} max={6} step={1} disabled={phase !== "idle"} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-4 w-4 text-brand" />
              <h3 className="font-display text-sm font-semibold">Studying</h3>
            </div>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={phase !== "idle"}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a subject (optional)" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subjectId && subjects.find((s) => s.id === subjectId) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Logging to <span className="font-medium text-foreground">{subjects.find((s) => s.id === subjectId)?.name}</span>
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand" />
              <h3 className="font-display text-sm font-semibold">Preferences</h3>
            </div>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-between text-sm">
                <span>Auto-start next phase</span>
                <Switch checked={autoStart} onCheckedChange={setAutoStart} />
              </label>
              <label className="flex cursor-pointer items-center justify-between text-sm">
                <span className="flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5" /> Sound on complete</span>
                <Switch checked={sound} onCheckedChange={setSound} />
              </label>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand/15 blur-2xl" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Today</p>
                <p className="font-display text-3xl font-semibold">{todayMinutes}<span className="ml-1 text-base text-muted-foreground">min</span></p>
                <p className="mt-0.5 text-xs text-muted-foreground">{completedWork} focus block{completedWork !== 1 ? "s" : ""} completed</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Flame className="h-6 w-6" />
              </div>
            </div>
            {completedWork > 0 && (
              <Button variant="ghost" size="sm" className="mt-3 w-full gap-2" onClick={() => setAppRoute("dashboard")}>
                <CheckCircle2 className="h-3.5 w-3.5" /> View on dashboard
              </Button>
            )}
          </Card>
        </div>
      </div>

      <ReflectionDialog
        open={reflectOpen}
        onOpenChange={setReflectOpen}
        sessionId={lastSessionId}
        duration={workMin}
      />
    </div>
  );
}

function ReflectionDialog({ open, onOpenChange, sessionId, duration }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sessionId: string | null;
  duration: number;
}) {
  const pushToast = useUI((s) => s.pushToast);
  const [focusScore, setFocusScore] = useState(80);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!sessionId) return;
    setSaving(true);
    try {
      await api(`/api/sessions/${sessionId}/reflect`, {
        method: "PATCH",
        json: { focusScore, note: note.trim() || undefined },
      });
      pushToast({ title: "Reflection saved", variant: "success" });
      onOpenChange(false);
      setNote("");
      setFocusScore(80);
    } catch (e: any) {
      pushToast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogTitle className="font-display text-lg font-semibold">How was that session?</DialogTitle>
        <p className="text-sm text-muted-foreground">
          You just studied for {duration} minutes. Rate your focus and jot a quick note.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label className="mb-2 flex items-center justify-between text-xs font-medium">
              <span>Focus score</span>
              <span className="font-mono text-brand">{focusScore}/100</span>
            </Label>
            <div className="flex gap-1.5">
              {[
                { label: "Distracted", val: 30, emoji: "😤" },
                { label: "Okay", val: 60, emoji: "😐" },
                { label: "Focused", val: 80, emoji: "😊" },
                { label: "Flow state", val: 100, emoji: "🚀" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setFocusScore(opt.val)}
                  className={cn(
                    "flex-1 rounded-lg border p-2 text-center transition-all",
                    focusScore === opt.val ? "border-brand bg-brand/10" : "border-border hover:border-foreground/20"
                  )}
                >
                  <div className="text-lg">{opt.emoji}</div>
                  <div className="text-[9px] text-muted-foreground">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-medium">Reflection (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you work on? What clicked? What was hard?"
              rows={3}
              className="resize-none"
              maxLength={500}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Skip</Button>
          <Button disabled={saving} onClick={save} className="gap-1.5">
            {saving ? "Saving…" : "Save reflection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function fmt(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
