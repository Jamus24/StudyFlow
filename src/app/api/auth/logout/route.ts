import { db } from "@/lib/db";
import { clearSession } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await db.activityLog.create({ data: { userId: user.id, action: "auth.logout" } });
    }
    await clearSession();
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
