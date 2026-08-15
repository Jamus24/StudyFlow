import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    // fetch last 20 weeks (140 days) of daily stats
    const startDate = new Date(Date.now() - 140 * 864e5);
    const stats = await db.dailyStat.findMany({
      where: { userId: user.id, date: { gte: startDate.toISOString().slice(0, 10) } },
      select: { date: true, minutes: true },
    });

    return ok({ data: stats.map((s) => ({ date: s.date, minutes: s.minutes })) });
  } catch (e) {
    return fail(e);
  }
}
