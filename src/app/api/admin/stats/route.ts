import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const [users, sessions, tasks, plans, notes, decks, tickets, logs] = await Promise.all([
      db.user.count(),
      db.studySession.count(),
      db.task.count(),
      db.studyPlan.count(),
      db.note.count(),
      db.deck.count(),
      db.supportTicket.count({ where: { status: "open" } }),
      db.systemLog.count({ where: { level: "error" } }),
    ]);
    const payingUsers = await db.user.count({ where: { planTier: { in: ["pro", "scholar"] } } });
    const totalMinutes = await db.studySession.aggregate({ _sum: { durationMin: true } });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = await db.user.count({ where: { createdAt: { gte: monthStart } } });
    return ok({
      counts: { users, sessions, tasks, plans, notes, decks, tickets, logs },
      payingUsers,
      newThisMonth,
      totalMinutes: totalMinutes._sum.durationMin ?? 0,
    });
  } catch (e) {
    return fail(e);
  }
}
