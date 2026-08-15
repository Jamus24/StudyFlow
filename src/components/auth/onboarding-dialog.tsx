"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";
import { api } from "@/lib/fetch";
import { useAuthStore, useUI } from "@/lib/store";
import {
  GraduationCap, Target, FolderKanban, Sparkles, Check, ArrowRight,
  ArrowLeft, X, Plus, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GRADES = ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Undergrad Y1", "Undergrad Y2", "Undergrad Y3", "Postgrad", "Other"];
const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#10b981", "#f97316"];

export function OnboardingDialog() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const pushToast = useUI((s) => s.pushToast);
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [grade, setGrade] = useState(user?.grade || "Grade 11");
  const [goal, setGoal] = useState(user?.weeklyGoalMin || 420);
  const [subjects, setSubjects] = useState<{ name: string; color: string }[]>([
    { name: "", color: COLORS[0] },
  ]);

  // only show if user exists and not onboarded
  if (!user || user.onboarded || !open) return null;

  const steps = ["Grade", "Goal", "Subjects"];

  async function finish() {
    setLoading(true);
    try {
      const valid = subjects.filter((s) => s.name.trim());
      await api("/api/onboard", {
        method: "POST",
        json: { grade, weeklyGoalMin: goal, subjects: valid },
      });
      setUser({ ...user!, onboarded: true, grade, weeklyGoalMin: goal });
      pushToast({ title: "You're set up", description: "Welcome to Study Flow.", variant: "success" });
      setOpen(false);
    } catch (e: any) {
      pushToast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function skip() {
    setOpen(false);
    // mark as onboarded silently so it doesn't reappear
    if (user) {
      api("/api/onboard", { method: "POST", json: {} }).catch(() => {});
      setUser({ ...user, onboarded: true });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && skip()}>
      <DialogContent className="max-w-[520px] gap-0 overflow-hidden border-border bg-card p-0 sm:rounded-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 -z-10 opacity-60">
          <div className="absolute left-1/2 top-[-40%] h-40 w-[480px] -translate-x-1/2 bg-brand/10 blur-3xl rounded-full" />
        </div>
        <DialogTitle className="sr-only">Welcome to Study Flow – let's set you up</DialogTitle>

        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <Logo />
          <button onClick={skip} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* progress */}
        <div className="flex items-center gap-2 px-6 pt-5">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i < step ? "bg-brand text-brand-foreground" :
                i === step ? "bg-foreground text-background" :
                "bg-muted text-muted-foreground"
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn("text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              {i < steps.length - 1 && <div className={cn("h-px flex-1 transition-colors", i < step ? "bg-brand" : "bg-border")} />}
            </div>
          ))}
        </div>

        {/* body */}
        <div className="min-h-[280px] px-6 py-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="grade" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <div className="mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-brand" />
                  <h2 className="font-display text-lg font-semibold">What are you studying?</h2>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">This helps Study Flow tailor your plans and tutor answers.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGrade(g)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                        grade === g
                          ? "border-brand bg-brand/10 text-brand shadow-soft"
                          : "border-border bg-card hover:border-foreground/20"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="goal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <div className="mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-brand" />
                  <h2 className="font-display text-lg font-semibold">Weekly study goal</h2>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">A realistic target. You can change it anytime in Settings.</p>
                <div className="rounded-2xl border border-border bg-card p-6 text-center">
                  <p className="font-display text-4xl font-semibold text-gradient-brand">
                    {Math.floor(goal / 60)}h {goal % 60}m
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">per week</p>
                  <div className="mt-5 px-2">
                    <Slider value={[goal]} onValueChange={(v) => setGoal(v[0])} min={120} max={1800} step={30} />
                    <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                      <span>2h</span><span>15h</span><span>30h</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {[{l: "Light", v: 180}, {l: "Steady", v: 420}, {l: "Intense", v: 900}].map((p) => (
                    <button key={p.l} onClick={() => setGoal(p.v)} className={cn("flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors", goal === p.v ? "border-brand bg-brand/10 text-brand" : "border-border hover:border-foreground/20")}>
                      {p.l}<br/><span className="text-[10px] text-muted-foreground">{Math.floor(p.v/60)}h {p.v%60}m</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="subjects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <div className="mb-4 flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-brand" />
                  <h2 className="font-display text-lg font-semibold">Add your subjects</h2>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">You can add more later. Skip this if you just want to look around.</p>
                <div className="space-y-2">
                  {subjects.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        onClick={() => setSubjects(subjects.map((x, j) => j === i ? { ...x, color: COLORS[(COLORS.indexOf(x.color) + 1) % COLORS.length] } : x))}
                        className="h-8 w-8 shrink-0 rounded-lg border border-border"
                        style={{ background: s.color }}
                        aria-label="Change color"
                      />
                      <Input
                        value={s.name}
                        onChange={(e) => setSubjects(subjects.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        placeholder="e.g. Organic Chemistry"
                        className="h-10"
                      />
                      {subjects.length > 1 && (
                        <button onClick={() => setSubjects(subjects.filter((_, j) => j !== i))} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {subjects.length < 8 && (
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setSubjects([...subjects, { name: "", color: COLORS[subjects.length % COLORS.length] }])}>
                    <Plus className="h-3.5 w-3.5" /> Add subject
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button onClick={skip} className="text-sm text-muted-foreground hover:text-foreground">
            Skip setup
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            {step < 2 ? (
              <Button size="sm" className="gap-1.5" onClick={() => setStep(step + 1)}>
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" className="gap-1.5" onClick={finish} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {loading ? "Saving…" : "Start studying"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
