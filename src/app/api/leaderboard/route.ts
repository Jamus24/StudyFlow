import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

// GET /api/leaderboard – ranks all users by weekly study minutes.
// Anonymizes other users by default; shows first name + last initial.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const weekStart = new Date(Date.now() - 7 * 864e5);

    // aggregate weekly minutes per user
    const sessions = await db.studySession.findMany({
      where: { startedAt: { gte: weekStart } },
      select: { userId: true, durationMin: true },
    });

    const byUser = new Map<string, number>();
    for (const s of sessions) {
      byUser.set(s.userId, (byUser.get(s.userId) ?? 0) + s.durationMin);
    }

    // fetch user names
    const userIds = [...byUser.keys()];
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarUrl: true, planTier: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const entries = [...byUser.entries()]
      .map(([userId, minutes]) => {
        const u = userMap.get(userId);
        if (!u) return null;
        // anonymize: first name + last initial
        const parts = u.name.split(" ");
        const displayName = parts.length > 1
          ? `${parts[0]} ${parts[parts.length - 1][0]}.`
          : parts[0];
        return {
          userId,
          name: displayName,
          avatarUrl: u.avatarUrl,
          planTier: u.planTier,
          minutes,
          isYou: userId === user.id,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.minutes - a!.minutes));

    // assign ranks
    const ranked = entries.map((e, i) => ({ ...e!, rank: i + 1 }));

    // find current user's position (even if not in top list)
    const myEntry = ranked.find((e) => e.isYou);
    const myMinutes = byUser.get(user.id) ?? 0;
    const myRank = myEntry?.rank ?? ranked.length + 1;

    // top 10 + current user if outside top 10
    const top = ranked.slice(0, 10);
    if (!myEntry && myMinutes > 0) {
      top.push({ ...myEntry!, userId: user.id, name: "You", avatarUrl: user.avatarUrl, planTier: user.planTier, minutes: myMinutes, isYou: true, rank: myRank });
    }

    // stats
    const totalStudents = byUser.size;
    const avgMinutes = Math.round([...byUser.values()].reduce((a, b) => a + b, 0) / Math.max(1, totalStudents));

    return ok({
      leaderboard: top,
      myRank,
      myMinutes,
      totalStudents,
      avgMinutes,
      weekMinutes: myMinutes,
    });
  } catch (e) {
    return fail(e);
  }
}
