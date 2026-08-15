import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { z } from "zod";

const goalSchema = z.object({
  title: z.string().min(2, "Title too short").max(80),
  targetMin: z.number().int().min(60).max(5000),
});

// GET /api/groups/[id]/goals – list active group goals with progress
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;

    const membership = await db.groupMember.findFirst({ where: { groupId: id, userId: user.id } });
    if (!membership) throw new ApiError("FORBIDDEN", "You're not a member.", 403);

    const now = new Date();
    const goals = await db.groupGoal.findMany({
      where: { groupId: id, periodEnd: { gte: now } },
      orderBy: { createdAt: "desc" },
    });

    // get all member userIds
    const members = await db.groupMember.findMany({
      where: { groupId: id },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);

    // compute progress per goal
    const enriched = await Promise.all(
      goals.map(async (g) => {
        const agg = await db.studySession.aggregate({
          where: {
            userId: { in: memberIds },
            startedAt: { gte: g.periodStart, lte: g.periodEnd },
          },
          _sum: { durationMin: true },
        });
        const minutes = agg._sum.durationMin ?? 0;
        const pct = Math.min(100, Math.round((minutes / g.targetMin) * 100));
        return { ...g, minutesStudied: minutes, pct, memberCount: memberIds.length };
      })
    );

    return ok({ goals: enriched });
  } catch (e) {
    return fail(e);
  }
}

// POST /api/groups/[id]/goals – create a group goal (owner/admin only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;

    const membership = await db.groupMember.findFirst({ where: { groupId: id, userId: user.id } });
    if (!membership) throw new ApiError("FORBIDDEN", "You're not a member.", 403);
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new ApiError("FORBIDDEN", "Only owners and admins can create group goals.", 403);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = goalSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the goal", 400, parseZodError(parsed.error));

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 7 * 864e5); // 1 week

    const goal = await db.groupGoal.create({
      data: {
        groupId: id,
        title: parsed.data.title,
        targetMin: parsed.data.targetMin,
        periodStart: now,
        periodEnd,
      },
    });

    // notify all members
    const members = await db.groupMember.findMany({ where: { groupId: id }, select: { userId: true } });
    await db.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        type: "social",
        title: "New group goal",
        body: `${parsed.data.title} – ${parsed.data.targetMin}m this week`,
        link: "groups",
      })),
    });

    return ok({ goal });
  } catch (e) {
    return fail(e);
  }
}
