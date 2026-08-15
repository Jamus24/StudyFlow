import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.profile.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check your profile", 400, parseZodError(parsed.error));
    const updated = await db.user.update({
      where: { id: user.id },
      data: parsed.data,
      select: { id: true, name: true, email: true, bio: true, grade: true, timezone: true, avatarUrl: true, weeklyGoalMin: true },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "profile.updated" } });
    return ok({ user: updated });
  } catch (e) {
    return fail(e);
  }
}
