import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
