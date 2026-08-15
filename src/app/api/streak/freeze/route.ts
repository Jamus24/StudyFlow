import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

// POST /api/streak/freeze – use a freeze on yesterday (if missed) to protect the streak
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const fullUser = await db.user.findUnique({ where: { id: user.id }, select: { freezeCount: true } });
    if (!fullUser) throw new ApiError("NOT_FOUND", "User not found.", 404);
    if (fullUser.freezeCount <= 0) {
      throw new ApiError("NO_FREEZES", "You're out of freezes. Earn more by maintaining a 7-day streak.", 400);
    }

    const today = new Date();
    const yesterday = new Date(today.getTime() - 864e5);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    // check if yesterday was already studied or already frozen
    const [studiedYesterday, existingFreeze] = await Promise.all([
      db.dailyStat.findFirst({ where: { userId: user.id, date: yesterdayKey, minutes: { gt: 0 } } }),
      db.streakFreeze.findUnique({ where: { userId_date: { userId: user.id, date: yesterdayKey } } }),
    ]);

    if (studiedYesterday) {
      throw new ApiError("ALREADY_STUDIED", "You studied yesterday – no freeze needed.", 400);
    }
    if (existingFreeze) {
      throw new ApiError("ALREADY_FROZEN", "Yesterday is already frozen.", 400);
    }

    // apply the freeze
    await db.$transaction([
      db.streakFreeze.create({ data: { userId: user.id, date: yesterdayKey, reason: "manual" } }),
      db.user.update({ where: { id: user.id }, data: { freezeCount: { decrement: 1 } } }),
    ]);

    await db.activityLog.create({ data: { userId: user.id, action: "streak.freeze_used", meta: yesterdayKey } });
    await db.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "Streak frozen",
        body: `Your streak is protected for ${yesterday.toLocaleDateString(undefined, { weekday: "long" })}.`,
        link: "dashboard",
      },
    });

    return ok({ ok: true, frozenDate: yesterdayKey, freezesAvailable: fullUser.freezeCount - 1 });
  } catch (e) {
    return fail(e);
  }
}
