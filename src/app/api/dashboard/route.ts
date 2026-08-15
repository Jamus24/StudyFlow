import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const userId = user.id;
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 864e5);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [subjects, tasks, sessions7d, tasksDone7d, todayStats, notifications, activity, dueSoon, plans] = await Promise.all([
      db.subject.findMany({
        where: { userId, archived: false },
        orderBy: { order: "asc" },
        include: { _count: { select: { tasks: true, sessions: true } } },
      }),
      db.task.findMany({
        where: { userId },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        include: { subject: { select: { id: true, name: true, color: true } } },
      }),
      db.studySession.findMany({
        where: { userId, startedAt: { gte: weekStart } },
        include: { subject: { select: { name: true, color: true } } },
        orderBy: { startedAt: "asc" },
      }),
      db.task.count({ where: { userId, status: "done", updatedAt: { gte: weekStart } } }),
      db.dailyStat.findMany({
        where: { userId, date: { gte: weekStart.toISOString().slice(0, 10) } },
        orderBy: { date: "asc" },
      }),
      db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
      db.activityLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
      db.task.findMany({
        where: { userId, status: { not: "done" }, dueDate: { gte: now, lte: new Date(now.getTime() + 3 * 864e5) } },
        orderBy: { dueDate: "asc" },
        take: 6,
        include: { subject: { select: { name: true, color: true } } },
      }),
      db.studyPlan.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 4 }),
    ]);

    const minutes7d = sessions7d.reduce((s, x) => s + x.durationMin, 0);
    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 864e5);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const s of sessions7d) {
      const k = s.startedAt.toISOString().slice(0, 10);
      byDay[k] = (byDay[k] ?? 0) + s.durationMin;
    }
    const bySubject = new Map<string, { minutes: number; color: string }>();
    for (const s of sessions7d) {
      const name = s.subject?.name ?? "General";
      const color = s.subject?.color ?? "#2563eb";
      const prev = bySubject.get(name) ?? { minutes: 0, color };
      prev.minutes += s.durationMin;
      bySubject.set(name, prev);
    }
    const unread = notifications.filter((n) => !n.read).length;

    return ok({
      user: { ...user, createdAt: user.createdAt.toISOString(), lastActiveAt: user.lastActiveAt.toISOString(), trialEndsAt: user.trialEndsAt?.toISOString() ?? null },
      stats: {
        minutes7d,
        tasksDone7d,
        weeklyGoalMin: user.weeklyGoalMin,
        subjects: subjects.length,
        openTasks: tasks.filter((t) => t.status !== "done").length,
        streak: 0,
        unread,
      },
      subjects,
      tasks,
      sessions7d,
      byDay,
      bySubject: Object.fromEntries(bySubject),
      todayStats,
      notifications,
      activity,
      dueSoon,
      plans,
    });
  } catch (e) {
    return fail(e);
  }
}
