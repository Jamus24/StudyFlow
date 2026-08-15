import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  subjectId: z.string().optional().nullable(),
  type: z.enum(["weekly", "daily", "exam"]).default("weekly"),
  targetMin: z.number().int().min(15).max(2000),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const now = new Date();
    const goals = await db.studyGoal.findMany({
      where: { userId: user.id, periodEnd: { gte: now } },
      include: { subject: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });

    // compute progress for each goal (minutes studied in the goal's period for that subject)
    // + check milestone notifications (50%, 80%, 100%)
    const enriched = await Promise.all(
      goals.map(async (g) => {
        const where = {
          userId: user.id,
          startedAt: { gte: g.periodStart, lte: g.periodEnd },
          ...(g.subjectId ? { subjectId: g.subjectId } : {}),
        };
        const agg = await db.studySession.aggregate({ where, _sum: { durationMin: true } });
        const minutes = agg._sum.durationMin ?? 0;
        const pct = Math.min(100, Math.round((minutes / g.targetMin) * 100));

        // milestone notifications (only create once per goal per milestone)
        const milestones = [50, 80, 100].filter((m) => pct >= m);
        const subjectName = g.subject?.name ?? "All subjects";
        for (const m of milestones) {
          const notifKey = `goal_${g.id}_${m}`;
          // check if we already notified (use activity log as dedup)
          const existing = await db.activityLog.findFirst({
            where: { userId: user.id, action: "goal.milestone", meta: notifKey },
          });
          if (!existing) {
            await db.activityLog.create({ data: { userId: user.id, action: "goal.milestone", meta: notifKey } });
            const msg =
              m === 100 ? `Goal complete: ${subjectName}` :
              m === 80 ? `Almost there: ${subjectName} goal at ${pct}%` :
              `${subjectName} goal halfway (${pct}%)`;
            await db.notification.create({
              data: {
                userId: user.id,
                type: "task",
                title: m === 100 ? "Goal reached" : "Goal progress",
                body: msg,
                link: "dashboard",
              },
            });
          }
        }

        return { ...g, minutesStudied: minutes, pct };
      })
    );

    return ok({ goals: enriched });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the goal", 400);

    const { type, targetMin, subjectId } = parsed.data;
    const now = new Date();
    const periodStart = new Date(now);
    let periodEnd = new Date(now);
    if (type === "daily") periodEnd = new Date(now.getTime() + 864e5);
    else if (type === "weekly") periodEnd = new Date(now.getTime() + 7 * 864e5);
    else periodEnd = new Date(now.getTime() + 30 * 864e5); // exam = 30d sprint

    const goal = await db.studyGoal.create({
      data: {
        userId: user.id,
        subjectId: subjectId || null,
        type,
        targetMin,
        periodStart,
        periodEnd,
      },
      include: { subject: { select: { id: true, name: true, color: true } } },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "goal.created", meta: `${type} ${targetMin}m` } });
    return ok({ goal });
  } catch (e) {
    return fail(e);
  }
}
