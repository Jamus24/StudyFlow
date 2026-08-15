import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, setSession, generateToken } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit({ key: "register", limit: 8, windowMs: 60000 });
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many attempts. Try again in a minute.", 429);

    const body = await req.json().catch(() => ({}));
    const parsed = schemas.register.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION", "Please check your details", 400, parseZodError(parsed.error));
    }
    const { name, email, password } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) throw new ApiError("EMAIL_TAKEN", "An account with that email already exists.", 409);

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
        planTier: "free",
        planStatus: "active",
        trialEndsAt: new Date(Date.now() + 14 * 864e5),
        verifyToken: generateToken(),
        verifyTokenExp: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });
    await db.userPreference.create({ data: { userId: user.id } });
    await db.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "Welcome to Study Flow",
        body: "Add your subjects and generate your first AI study plan.",
        link: "app",
      },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "auth.register", meta: email } });

    await setSession({ sub: user.id, email: user.email, role: user.role });

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        planTier: user.planTier,
        planStatus: user.planStatus,
        onboarded: user.onboarded,
        grade: user.grade,
        timezone: user.timezone,
        weeklyGoalMin: user.weeklyGoalMin,
      },
      verifyToken: user.verifyToken,
    });
  } catch (e) {
    return fail(e);
  }
}
