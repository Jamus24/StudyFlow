import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const now = new Date();
    const months: { label: string; revenue: number; users: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const users = await db.user.count({ where: { createdAt: { gte: start, lt: end } } });
      const paying = await db.user.count({
        where: { createdAt: { gte: start, lt: end }, planTier: { in: ["pro", "scholar"] } },
      });
      const price = 9;
      months.push({
        label: start.toLocaleString("en-US", { month: "short" }),
        revenue: paying * price,
        users,
      });
    }
    const tierCounts = await db.user.groupBy({
      by: ["planTier"],
      _count: true,
    });
    const mrr = tierCounts
      .filter((t) => t.planTier !== "free")
      .reduce((s, t) => s + t._count * (t.planTier === "scholar" ? 19 : 9), 0);
    return ok({ months, tierCounts, mrr });
  } catch (e) {
    return fail(e);
  }
}
