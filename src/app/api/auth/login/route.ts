import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, setSession } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit({ key: "login", limit: 10, windowMs: 60000 });
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many login attempts. Slow down a little.", 429);

    const body = await req.json().catch(() => ({}));
    const parsed = schemas.login.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION", "Check your email and password", 400, parseZodError(parsed.error));
    }
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, role: true, avatarUrl: true, bio: true, grade: true, timezone: true, planTier: true, planStatus: true, onboarded: true, weeklyGoalMin: true, trialEndsAt: true, createdAt: true, passwordHash: true } });
    if (!user?.passwordHash) throw new ApiError('BAD_CREDENTIALS', 'That email or password does not match.', 401);
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new ApiError("BAD_CREDENTIALS", "That email or password doesn't match.", 401);

    await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    await db.activityLog.create({ data: { userId: user.id, action: "auth.login" } });
    await setSession({ sub: user.id, email: user.email, role: user.role });

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        grade: user.grade,
        timezone: user.timezone,
        planTier: user.planTier,
        planStatus: user.planStatus,
        onboarded: user.onboarded,
        weeklyGoalMin: user.weeklyGoalMin,
        trialEndsAt: user.trialEndsAt,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
