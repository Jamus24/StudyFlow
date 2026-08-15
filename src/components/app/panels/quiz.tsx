"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { PanelHeader, EmptyState } from "../panel-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import {
  HelpCircle, Sparkles, Check, X, ArrowRight, RotateCcw, Trophy,
  Loader2, Brain, Target, Lightbulb, ChevronRight, History, TrendingUp, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

interface Quiz {
  topic: string;
  subject: string;
  difficulty: string;
  questions: QuizQuestion[];
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

export { QuizPanel as default };

function QuizPanel() {
  const pushToast = useUI((s) => s.pushToast);
  const qc = useQueryClient();
  const { data: subjectsData } = useQuery<{ subjects: Subject[] }>({
    queryKey: ["/api/subjects"],
    queryFn: () => api("/api/subjects"),
  });
  const subjects = subjectsData?.subjects ?? [];

  const [form, setForm] = useState({ subjectId: "", topic: "", count: 5, difficulty: "medium" as "easy" | "medium" | "hard" });
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [view, setView] = useState<"setup" | "history">("setup");
  const savedRef = useRef(false);

  const generate = useMutation({
    mutationFn: () => api<{ quiz: Quiz }>("/api/quiz", { method: "POST", json: form }),
    onSuccess: (data) => {
      setQuiz(data.quiz);
      setCurrentIdx(0);
      setAnswers({});
      setShowResult(false);
      savedRef.current = false;
      pushToast({ title: "Quiz ready", description: `${data.quiz.questions.length} questions generated`, variant: "success" });
    },
    onError: (e: any) => pushToast({ title: "Could not generate", description: e.message, variant: "destructive" }),
  });

  const saveResult = useMutation({
    mutationFn: (payload: any) => api("/api/quiz/save", { method: "POST", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/quiz/save"] }),
  });

  // save result when quiz completes (once per quiz)
  useEffect(() => {
    if (showResult && quiz && !savedRef.current) {
      savedRef.current = true;
      const correct = quiz.questions.filter((q) => answers[q.id] === q.correctIndex).length;
      saveResult.mutate({
        topic: quiz.topic,
        subject: quiz.subject,
        difficulty: quiz.difficulty,
        totalQuestions: quiz.questions.length,
        correctCount: correct,
        questions: JSON.stringify({ quiz, answers }),
      });
    }
  }, [showResult, quiz, answers, saveResult]);

  function answer(qId: number, optionIdx: number) {
    if (answers[qId] !== undefined) return; // already answered
    setAnswers({ ...answers, [qId]: optionIdx });
  }

  function next() {
    if (currentIdx < (quiz?.questions.length ?? 0) - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setShowResult(true);
    }
  }

  function restart() {
    setQuiz(null);
    setCurrentIdx(0);
    setAnswers({});
    setShowResult(false);
  }

  // Result screen
  if (showResult && quiz) {
    const correct = quiz.questions.filter((q) => answers[q.id] === q.correctIndex).length;
    const pct = Math.round((correct / quiz.questions.length) * 100);
    const passed = pct >= 70;

    return (
      <div>
        <PanelHeader title="Mock Quiz" description="Results" icon={HelpCircle} />
        <Card className="relative overflow-hidden p-8 text-center">
          <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-40 blur-3xl", passed ? "bg-blue-500/15" : "bg-amber-500/15")} />
          <div className="relative">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className={cn("mx-auto flex h-20 w-20 items-center justify-center rounded-full", passed ? "bg-blue-500/15 text-blue-500" : "bg-amber-500/15 text-amber-500")}
            >
              <Trophy className="h-10 w-10" />
            </motion.div>
            <h2 className="mt-4 font-display text-3xl font-semibold">
              {correct} / {quiz.questions.length}
            </h2>
            <p className={cn("mt-1 text-lg font-medium", passed ? "text-blue-500" : "text-amber-500")}>
              {pct}% · {passed ? "Well done!" : "Keep practicing"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {quiz.topic} · {quiz.difficulty} difficulty
            </p>
          </div>

          {/* Question review */}
          <div className="mt-8 space-y-3 text-left">
            {quiz.questions.map((q, i) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correctIndex;
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={cn("rounded-xl border p-4", isCorrect ? "border-blue-500/30 bg-blue-500/5" : "border-destructive/30 bg-destructive/5")}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", isCorrect ? "bg-blue-500 text-white" : "bg-destructive text-white")}>
                      {isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{q.question}</p>
                      {!isCorrect && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Correct: <span className="font-medium text-blue-600 dark:text-blue-400">{q.options[q.correctIndex]}</span>
                        </p>
                      )}
                      <p className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
                        <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" className="gap-1.5" onClick={restart}>
              <RotateCcw className="h-4 w-4" /> New quiz
            </Button>
            <Button className="gap-1.5" onClick={() => generate.mutate()}>
              <Sparkles className="h-4 w-4" /> Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Quiz in progress
  if (quiz) {
    const q = quiz.questions[currentIdx];
    const userAnswer = answers[q.id];
    const answered = userAnswer !== undefined;
    const isLast = currentIdx === quiz.questions.length - 1;

    return (
      <div>
        <PanelHeader
          title="Mock Quiz"
          description={`${quiz.topic} · ${quiz.difficulty}`}
          icon={HelpCircle}
          actions={
            <Button variant="ghost" size="sm" onClick={restart}>Exit</Button>
          }
        />

        {/* progress bar */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Question {currentIdx + 1} of {quiz.questions.length}</span>
            <span className="font-medium">{Object.keys(answers).length} answered</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand to-[var(--gold)]"
              animate={{ width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </Card>

        {/* question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="mt-4 p-6">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="rounded-md text-[10px]">{q.topic}</Badge>
              </div>
              <h2 className="font-display text-xl font-semibold leading-tight">{q.question}</h2>

              <div className="mt-5 space-y-2.5">
                {q.options.map((opt, idx) => {
                  const isSelected = userAnswer === idx;
                  const isCorrect = idx === q.correctIndex;
                  const showCorrect = answered && isCorrect;
                  const showWrong = answered && isSelected && !isCorrect;

                  return (
                    <button
                      key={idx}
                      onClick={() => answer(q.id, idx)}
                      disabled={answered}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                        !answered && "hover:border-foreground/20 hover:bg-muted/40",
                        showCorrect && "border-blue-500/40 bg-blue-500/10",
                        showWrong && "border-destructive/40 bg-destructive/10",
                        !showCorrect && !showWrong && answered && "border-border opacity-60",
                      )}
                    >
                      <span className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        showCorrect && "border-blue-500 bg-blue-500 text-white",
                        showWrong && "border-destructive bg-destructive text-white",
                        !showCorrect && !showWrong && "border-border text-muted-foreground",
                      )}>
                        {showCorrect ? <Check className="h-3.5 w-3.5" /> : showWrong ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {answered && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-start gap-2.5 rounded-lg bg-accent/50 p-3"
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-sm text-foreground/90">{q.explanation}</p>
                </motion.div>
              )}

              {answered && (
                <div className="mt-5 flex justify-end">
                  <Button className="gap-1.5" onClick={next}>
                    {isLast ? "See results" : "Next question"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Setup screen
  return (
    <div>
      <PanelHeader
        title="Mock Quiz"
        description="Generate practice questions and test your knowledge"
        icon={HelpCircle}
        actions={
          <Button
            variant={view === "setup" ? "outline" : "default"}
            size="sm"
            className="gap-1.5"
            onClick={() => setView(view === "setup" ? "history" : "setup")}
          >
            {view === "setup" ? <><History className="h-3.5 w-3.5" /> History</> : <><Sparkles className="h-3.5 w-3.5" /> New quiz</>}
          </Button>
        }
      />

      {view === "history" ? (
        <QuizHistory />
      ) : (
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Generate a practice quiz</h2>
              <p className="text-sm text-muted-foreground">AI writes questions, you answer. Get instant feedback + explanations.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <Label className="mb-1.5 text-xs font-medium">Subject (optional)</Label>
              <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose a subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 text-xs font-medium">Topic</Label>
              <Input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. SN1 vs SN2 reactions, hypothesis testing, cell membranes"
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 text-xs font-medium">Questions</Label>
                <Select value={String(form.count)} onValueChange={(v) => setForm({ ...form, count: Number(v) })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 text-xs font-medium">Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v: any) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            className="mt-6 w-full gap-2"
            size="lg"
            disabled={!form.topic.trim() || generate.isPending}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating quiz…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate quiz</>
            )}
          </Button>

          {/* feature highlights */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { icon: Target, label: "Topic-specific" },
              { icon: Lightbulb, label: "Explanations" },
              { icon: Trophy, label: "Instant scoring" },
            ].map((f) => (
              <div key={f.label} className="rounded-lg border border-border bg-card p-3">
                <f.icon className="mx-auto h-4 w-4 text-brand" />
                <p className="mt-1.5 text-[10px] text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
      )}
    </div>
  );
}

interface QuizResultItem {
  id: string;
  topic: string;
  subject: string;
  difficulty: string;
  totalQuestions: number;
  correctCount: number;
  scorePct: number;
  createdAt: string;
}

function QuizHistory() {
  const { data, isLoading } = useQuery<{ results: QuizResultItem[]; stats: { total: number; avgScore: number; passed: number; bestScore: number } }>({
    queryKey: ["/api/quiz/save"],
    queryFn: () => api("/api/quiz/save"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative h-20 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="skeleton-shimmer absolute inset-0 bg-muted/30" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No quiz history yet"
        description="Complete a quiz and your results will appear here so you can track improvement."
      />
    );
  }

  const { results, stats } = data;

  return (
    <div>
      {/* stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Quizzes taken", value: stats.total, icon: History, color: "#2563eb" },
          { label: "Average score", value: `${stats.avgScore}%`, icon: TrendingUp, color: "#f59e0b" },
          { label: "Passed (≥70%)", value: stats.passed, icon: Check, color: "#2563eb" },
          { label: "Best score", value: `${stats.bestScore}%`, icon: Award, color: "#8b5cf6" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${s.color}1a`, color: s.color }}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="font-display text-lg font-semibold tabular-nums">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* progress chart */}
      {results.length >= 2 && (
        <Card className="mb-4 p-5">
          <h3 className="mb-1 font-display text-sm font-semibold">Score trend</h3>
          <p className="mb-3 text-xs text-muted-foreground">Your quiz scores over time</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...results].reverse().map((r, i) => ({
                idx: i + 1,
                score: r.scorePct,
                label: new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
              }))} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <RTooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`${v}%`, "Score"]} />
                <Line type="monotone" dataKey="score" stroke="var(--brand)" strokeWidth={2.5} dot={{ fill: "var(--brand)", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* history list */}
      <Card className="p-5">
        <h3 className="mb-4 font-display text-sm font-semibold">Recent quizzes</h3>
        <div className="space-y-2">
          {results.map((r, i) => {
            const passed = r.scorePct >= 70;
            const date = new Date(r.createdAt);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                  passed ? "bg-blue-500/15 text-blue-500" : "bg-amber-500/15 text-amber-500"
                )}>
                  {r.scorePct}%
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.topic}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.subject} · {r.difficulty} · {r.correctCount}/{r.totalQuestions} correct
                  </p>
                </div>
                <div className="text-right">
                  {passed && <Badge className="rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px]">Pass</Badge>}
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
