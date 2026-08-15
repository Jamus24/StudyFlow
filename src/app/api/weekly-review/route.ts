import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { weeklyInsights, chatJSON } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 864e5);
    const monthStart = new Date(now.getTime() - 30 * 864e5);

    const [sessions, tasksDone, tasksCreated, plans, notes, decks, sessions30] = await Promise.all([
      db.studySession.findMany({
        where: { userId: user.id, startedAt: { gte: weekStart } },
        include: { subject: { select: { name: true, color: true } }, task: { select: { title: true } } },
        orderBy: { startedAt: "asc" },
      }),
      db.task.count({ where: { userId: user.id, status: "done", updatedAt: { gte: weekStart } } }),
      db.task.count({ where: { userId: user.id, createdAt: { gte: weekStart } } }),
      db.studyPlan.count({ where: { userId: user.id, createdAt: { gte: weekStart } } }),
      db.note.count({ where: { userId: user.id, createdAt: { gte: weekStart } } }),
      db.deck.count({ where: { userId: user.id, createdAt: { gte: weekStart } } }),
      db.studySession.findMany({
        where: { userId: user.id, startedAt: { gte: monthStart } },
        select: { durationMin: true, startedAt: true, focusScore: true, subject: { select: { name: true, color: true } } },
      }),
    ]);

    const minutes7d = sessions.reduce((s, x) => s + x.durationMin, 0);
    const minutes30d = sessions30.reduce((s, x) => s + x.durationMin, 0);
    const avgFocus = sessions.length
      ? Math.round(sessions.reduce((s, x) => s + (x.focusScore ?? 0), 0) / sessions.length)
      : 0;

    // by subject (7d)
    const bySubject = new Map<string, { minutes: number; color: string; sessions: number }>();
    for (const s of sessions) {
      const name = s.subject?.name ?? "General";
      const color = s.subject?.color ?? "#94a3b8";
      const prev = bySubject.get(name) ?? { minutes: 0, color, sessions: 0 };
      prev.minutes += s.durationMin;
      prev.sessions += 1;
      bySubject.set(name, prev);
    }

    // by day (7d)
    const byDay: Record<string, number> = {};
    const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 864e5);
      byDay[DOW[d.getDay()]] = 0;
    }
    for (const s of sessions) {
      const k = DOW[s.startedAt.getDay()];
      if (k in byDay) byDay[k] += s.durationMin;
    }

    // streak (current + best)
    const studiedDays = await db.dailyStat.findMany({
      where: { userId: user.id, minutes: { gt: 0 } },
      orderBy: { date: "asc" },
      select: { date: true },
    });
    const daySet = new Set(studiedDays.map((s) => s.date));
    const todayKey = now.toISOString().slice(0, 10);
    let streak = 0;
    let cursor = new Date(now);
    if (!daySet.has(todayKey)) cursor = new Date(cursor.getTime() - 864e5);
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor = new Date(cursor.getTime() - 864e5);
    }
    // best streak
    let best = 0, cur = 0; let prev: Date | null = null;
    for (const s of studiedDays) {
      const d = new Date(s.date + "T00:00:00");
      if (prev) {
        const diff = Math.round((d.getTime() - prev.getTime()) / 864e5);
        cur = diff === 1 ? cur + 1 : 1;
      } else cur = 1;
      best = Math.max(best, cur);
      prev = d;
    }

    // AI insight (rate-limited)
    const rl = rateLimit({ key: "insights", limit: 20, windowMs: 60000 });
    let insight = "";
    const topSubject = [...bySubject.entries()].sort((a, b) => b[1].minutes - a[1].minutes)[0]?.[0] ?? "General";
    if ((await rl).ok) {
      try {
        insight = await weeklyInsights({ minutes: minutes7d, tasksDone, topSubject, goalMin: user.weeklyGoalMin });
      } catch {
        insight = "";
      }
    }

    // AI suggestions for next week (concrete, non-generic)
    let nextSteps: string[] = [];
    const rl2 = rateLimit({ key: "weeklyReview", limit: 10, windowMs: 60000 });
    if ((await rl2).ok && sessions.length > 0) {
      try {
        const sys = `You are a study coach writing a weekly review. Return ONLY a JSON array of 3-4 short, specific, non-generic suggestions for next week based on the student's data. Each suggestion under 14 words. No clichés.`;
        const usr = `Week data: ${minutes7d}m studied (goal ${user.weeklyGoalMin}m), ${tasksDone} tasks done, ${sessions.length} sessions, top subject ${topSubject}, streak ${streak}d, avg focus ${avgFocus}/100. Subjects: ${[...bySubject.keys()].join(", ")}.`;
        const raw = await chatJSON(sys, usr, { temperature: 0.6 });
        const parsed = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] || "[]");
        if (Array.isArray(parsed)) nextSteps = parsed.filter((x) => typeof x === "string").slice(0, 4);
      } catch {}
    }

    const goalPct = Math.min(100, Math.round((minutes7d / Math.max(1, user.weeklyGoalMin)) * 100));

    return ok({
      week: {
        minutes: minutes7d,
        goalMin: user.weeklyGoalMin,
        goalPct,
        sessions: sessions.length,
        tasksDone,
        tasksCreated,
        plans,
        notes,
        decks,
        avgFocus,
        streak,
        bestStreak: best,
        topSubject,
        byDay,
        bySubject: Object.fromEntries(bySubject),
        minutes30d,
        sessions30: sessions30.length,
      },
      insight,
      nextSteps,
      period: {
        start: weekStart.toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (e) {
    return fail(e);
  }
}
