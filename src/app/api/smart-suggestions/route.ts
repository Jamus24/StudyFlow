import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { chatJSON } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

interface Suggestion {
  id: string;
  type: "task" | "review" | "plan" | "break" | "goal" | "tutor";
  title: string;
  description: string;
  action: string; // app route to navigate to
  priority: "high" | "medium" | "low";
  icon: string;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 864e5);

    // gather user state in parallel
    const [tasks, sessions, subjects, decks, streakRows, plans] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id, status: { not: "done" } },
        orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
        take: 10,
        include: { subject: { select: { name: true, color: true } } },
      }),
      db.studySession.findMany({
        where: { userId: user.id, startedAt: { gte: weekStart } },
        select: { durationMin: true, startedAt: true, subjectId: true },
      }),
      db.subject.findMany({ where: { userId: user.id, archived: false }, select: { id: true, name: true, color: true, examDate: true } }),
      db.flashcard.findMany({
        where: { deck: { userId: user.id }, dueAt: { lte: now } },
        select: { id: true, deck: { select: { name: true } } },
      }),
      db.dailyStat.findMany({ where: { userId: user.id, minutes: { gt: 0 } }, orderBy: { date: "desc" }, take: 7, select: { date: true } }),
      db.studyPlan.count({ where: { userId: user.id } }),
    ]);

    const weekMinutes = sessions.reduce((s, x) => s + x.durationMin, 0);
    const studiedToday = streakRows.some((s) => s.date === now.toISOString().slice(0, 10));
    const dueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) <= new Date(now.getTime() + 2 * 864e5));
    const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
    const dueCards = decks.length;

    // compute current streak
    const studiedDays = new Set(streakRows.map((s) => s.date));
    let streak = 0;
    let cursor = new Date(now);
    if (!studiedDays.has(now.toISOString().slice(0, 10))) cursor = new Date(cursor.getTime() - 864e5);
    while (studiedDays.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor = new Date(cursor.getTime() - 864e5);
    }

    const suggestions: Suggestion[] = [];

    // Rule-based suggestions (instant, no AI needed)
    if (overdueTasks.length > 0) {
      suggestions.push({
        id: "overdue",
        type: "task",
        title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
        description: `"${overdueTasks[0].title}" is past due. Tackle it now to clear the backlog.`,
        action: "tasks",
        priority: "high",
        icon: "alert",
      });
    }

    if (!studiedToday && streak > 0) {
      suggestions.push({
        id: "streak-protect",
        type: "break",
        title: `Protect your ${streak}-day streak`,
        description: streak > 3 ? "A quick 15-minute session keeps your streak alive." : "Log a short session today to keep your streak going.",
        action: "focus",
        priority: "high",
        icon: "flame",
      });
    }

    if (dueCards > 0) {
      suggestions.push({
        id: "flashcards-due",
        type: "review",
        title: `${dueCards} flashcard${dueCards > 1 ? "s" : ""} due for review`,
        description: "Spaced repetition works best when you review on time. Takes ~5 minutes.",
        action: "flashcards",
        priority: "medium",
        icon: "layers",
      });
    }

    if (dueTasks.length > 0 && overdueTasks.length === 0) {
      const nextTask = dueTasks[0];
      suggestions.push({
        id: "next-task",
        type: "task",
        title: `Up next: ${nextTask.title}`,
        description: nextTask.subject ? `${nextTask.subject.name} · ~${nextTask.estMinutes}m` : `~${nextTask.estMinutes}m estimated`,
        action: "tasks",
        priority: "medium",
        icon: "check",
      });
    }

    if (plans === 0) {
      suggestions.push({
        id: "first-plan",
        type: "plan",
        title: "Generate your first AI study plan",
        description: "Tell Study Flow your goal and available hours – get a realistic week in under a minute.",
        action: "plans",
        priority: "medium",
        icon: "sparkles",
      });
    }

    if (weekMinutes < user.weeklyGoalMin * 0.5 && weekMinutes > 0) {
      suggestions.push({
        id: "goal-behind",
        type: "goal",
        title: "You're behind on your weekly goal",
        description: `${Math.round((weekMinutes / user.weeklyGoalMin) * 100)}% of goal. A 45-min session today gets you back on track.`,
        action: "focus",
        priority: "medium",
        icon: "target",
      });
    }

    if (subjects.length === 0) {
      suggestions.push({
        id: "add-subjects",
        type: "task",
        title: "Add your subjects",
        description: "Study Flow needs to know what you're studying to build useful plans.",
        action: "subjects",
        priority: "high",
        icon: "folder",
      });
    }

    // AI suggestion (rate-limited, adds a personalized touch)
    const rl = rateLimit({ key: "smart-suggestions", limit: 15, windowMs: 60000 });
    if ((await rl).ok && suggestions.length < 4) {
      try {
        const sys = `You are a study coach. Given a student's current state, suggest ONE specific, actionable next step. Return ONLY a JSON object: {"title": string (under 40 chars), "description": string (under 100 chars, specific and non-generic)}. No clichés.`;
        const state = `Streak: ${streak}d. Week minutes: ${weekMinutes}/${user.weeklyGoalMin}. Overdue tasks: ${overdueTasks.length}. Due cards: ${dueCards}. Subjects: ${subjects.map((s) => s.name).join(", ") || "none"}. Plans: ${plans}. Studied today: ${studiedToday}.`;
        const raw = await chatJSON(sys, state, { temperature: 0.6 });
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.title && parsed.description) {
            suggestions.push({
              id: "ai-suggestion",
              type: "tutor",
              title: parsed.title,
              description: parsed.description,
              action: "dashboard",
              priority: "low",
              icon: "brain",
            });
          }
        }
      } catch {
        // AI failed – rule-based suggestions are enough
      }
    }

    // sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return ok({ suggestions, context: { streak, weekMinutes, studiedToday, overdueCount: overdueTasks.length, dueCards } });
  } catch (e) {
    return fail(e);
  }
}
