import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const tickets = await db.supportTicket.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    });
    return ok({ tickets });
  } catch (e) {
    return fail(e);
  }
}
