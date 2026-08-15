import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    let prefs = await db.userPreference.findUnique({ where: { userId: user.id } });
    if (!prefs) prefs = await db.userPreference.create({ data: { userId: user.id } });
    return ok({ preferences: prefs });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.preferences.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check preferences", 400, parseZodError(parsed.error));
    const prefs = await db.userPreference.upsert({
      where: { userId: user.id },
      update: parsed.data,
      create: { userId: user.id, ...parsed.data },
    });
    return ok({ preferences: prefs });
  } catch (e) {
    return fail(e);
  }
}
