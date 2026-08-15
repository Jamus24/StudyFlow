import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { weeklyInsights } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const since = new Date(Date.now() - 7 * 864e5);
    const sessions = await db.studySession.findMany({
      where: { userId: user.id, startedAt: { gte: since } },
      include: { subject: { select: { name: true } } },
    });
    const minutes = sessions.reduce((s, x) => s + x.durationMin, 0);
    const tasksDone = await db.task.count({ where: { userId: user.id, status: "done", updatedAt: { gte: since } } });
    const bySubject = new Map<string, number>();
    for (const s of sessions) {
      const name = s.subject?.name ?? "General";
      bySubject.set(name, (bySubject.get(name) ?? 0) + s.durationMin);
    }
    const topSubject = [...bySubject.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "General";

    const rl = await rateLimit({ key: "insights", limit: 20, windowMs: 60000 });
    let insight = "";
    if (rl.ok) {
      try {
        insight = await weeklyInsights({ minutes, tasksDone, topSubject, goalMin: user.weeklyGoalMin });
      } catch {
        insight = "";
      }
    }
    return ok({ minutes, tasksDone, topSubject, goalMin: user.weeklyGoalMin, insight, bySubject: Object.fromEntries(bySubject) });
  } catch (e) {
    return fail(e);
  }
}
