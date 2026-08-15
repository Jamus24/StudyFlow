import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const today = new Date();
    const oneDay = 864e5;
    const todayKey = today.toISOString().slice(0, 10);

    // studied days (minutes > 0) AND frozen days both count for streak continuity
    const [stats, freezes] = await Promise.all([
      db.dailyStat.findMany({
        where: { userId: user.id, minutes: { gt: 0 } },
        orderBy: { date: "asc" },
        select: { date: true },
      }),
      db.streakFreeze.findMany({ where: { userId: user.id }, select: { date: true } }),
    ]);

    const studiedSet = new Set(stats.map((s) => s.date));
    const freezeSet = new Set(freezes.map((f) => f.date));
    // a day "counts" if studied OR frozen
    const counts = (key: string) => studiedSet.has(key) || freezeSet.has(key);

    // best streak (longest run of counting days)
    let best = 0;
    let cur = 0;
    let prev: Date | null = null;
    const allCountingDays = [...new Set([...stats.map((s) => s.date), ...freezes.map((f) => f.date)])].sort();
    for (const dateStr of allCountingDays) {
      const d = new Date(dateStr + "T00:00:00");
      if (prev) {
        const diff = Math.round((d.getTime() - prev.getTime()) / oneDay);
        if (diff === 1) cur += 1;
        else cur = 1;
      } else cur = 1;
      best = Math.max(best, cur);
      prev = d;
    }

    // current streak: walk back from today (or yesterday if today not yet counted)
    let cursor = new Date(today);
    let active = 0;
    if (!counts(todayKey)) cursor = new Date(cursor.getTime() - oneDay);
    while (counts(cursor.toISOString().slice(0, 10))) {
      active += 1;
      cursor = new Date(cursor.getTime() - oneDay);
    }
    // current streak should not count "today" if today is only a freeze (freeze protects yesterday's streak, doesn't extend)
    // Actually: a freeze on a gap day protects the streak. If today is studied, it extends. If yesterday was a freeze and today isn't studied, streak ends at yesterday.

    // check: did user study today?
    const studiedToday = studiedSet.has(todayKey);

    // fetch available freezes
    const userWithFreezes = await db.user.findUnique({
      where: { id: user.id },
      select: { freezeCount: true },
    });

    return ok({
      streak: active,
      best,
      studiedToday,
      freezesUsed: freezes.length,
      freezesAvailable: userWithFreezes?.freezeCount ?? 0,
    });
  } catch (e) {
    return fail(e);
  }
}
