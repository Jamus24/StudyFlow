import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

// GET /api/streak/shop – returns shop info (available freezes, cost, points balance)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { freezeCount: true, streakFreezes: true },
    });

    // compute "study points" from total minutes studied + achievements
    const [totalMinutes, achievements] = await Promise.all([
      db.studySession.aggregate({ where: { userId: user.id }, _sum: { durationMin: true } }),
      db.achievement.count({ where: { userId: user.id } }),
    ]);

    const minutes = totalMinutes._sum.durationMin ?? 0;
    // points: 1 per minute studied + 50 per achievement
    const points = Math.floor(minutes) + achievements * 50;

    // shop items
    const items = [
      { id: "freeze_1", label: "1 Streak Freeze", cost: 100, icon: "snowflake", description: "Protect your streak on one missed day" },
      { id: "freeze_3", label: "3 Streak Freezes", cost: 250, icon: "snowflake", description: "Save 50 points vs buying individually", bestValue: true },
      { id: "freeze_5", label: "5 Streak Freezes", cost: 400, icon: "snowflake", description: "Best deal – save 100 points" },
    ];

    return ok({
      points,
      freezesAvailable: fullUser?.freezeCount ?? 0,
      totalMinutes: minutes,
      achievements,
      items,
    });
  } catch (e) {
    return fail(e);
  }
}

// POST /api/streak/shop – purchase a freeze pack
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const { itemId } = await req.json().catch(() => ({}));
    const costs: Record<string, { amount: number; freezes: number }> = {
      freeze_1: { amount: 100, freezes: 1 },
      freeze_3: { amount: 250, freezes: 3 },
      freeze_5: { amount: 400, freezes: 5 },
    };

    const item = costs[itemId];
    if (!item) throw new ApiError("INVALID_ITEM", "Unknown shop item.", 400);

    // compute current points
    const [totalMinutes, achievements] = await Promise.all([
      db.studySession.aggregate({ where: { userId: user.id }, _sum: { durationMin: true } }),
      db.achievement.count({ where: { userId: user.id } }),
    ]);
    const points = Math.floor(totalMinutes._sum.durationMin ?? 0) + achievements * 50;

    if (points < item.amount) {
      throw new ApiError("INSUFFICIENT_POINTS", `You need ${item.amount - points} more points. Study more to earn!`, 400);
    }

    // deduct points by recording the purchase in activity log (points are computed, not stored)
    // We need to track spent points. Let's use a simple approach: store in UserPreference or compute spent from activity log.
    // For simplicity, we'll track spent points via activity log entries.
    const spentResult = await db.activityLog.aggregate({
      where: { userId: user.id, action: "shop.purchase" },
      _sum: {},
    });
    // Actually, let's store the spent amount in meta and sum it
    const spentLogs = await db.activityLog.findMany({
      where: { userId: user.id, action: "shop.purchase" },
      select: { meta: true },
    });
    const spentPoints = spentLogs.reduce((sum, log) => {
      const m = log.meta?.match(/cost:(\d+)/);
      return sum + (m ? parseInt(m[1], 10) : 0);
    }, 0);

    const availablePoints = points - spentPoints;
    if (availablePoints < item.amount) {
      throw new ApiError("INSUFFICIENT_POINTS", `You need ${item.amount - availablePoints} more points. Study more to earn!`, 400);
    }

    // grant freezes
    await db.user.update({
      where: { id: user.id },
      data: { freezeCount: { increment: item.freezes } },
    });

    // log purchase
    await db.activityLog.create({
      data: { userId: user.id, action: "shop.purchase", meta: `${itemId} cost:${item.amount} freezes:${item.freezes}` },
    });

    await db.notification.create({
      data: {
        userId: user.id,
        type: "social",
        title: `+${item.freezes} streak freeze${item.freezes > 1 ? "s" : ""}`,
        body: `Purchased from the study shop. Spend ${item.amount} points.`,
        link: "dashboard",
      },
    });

    return ok({
      ok: true,
      freezesGranted: item.freezes,
      pointsSpent: item.amount,
      pointsRemaining: availablePoints - item.amount,
    });
  } catch (e) {
    return fail(e);
  }
}
