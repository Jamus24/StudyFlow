import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null });
    const prefs = await db.userPreference.findUnique({ where: { userId: user.id } });
    return ok({ user, preferences: prefs });
  } catch (e) {
    return fail(e);
  }
}
