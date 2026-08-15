import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { token } = await req.json().catch(() => ({}));
    const u = await db.user.findUnique({ where: { id: user.id } });
    if (!u) throw new ApiError("NOT_FOUND", "Account not found.", 404);
    if (u.emailVerified) return ok({ verified: true });
    if (!token || token !== u.verifyToken || !u.verifyTokenExp || u.verifyTokenExp < new Date()) {
      throw new ApiError("BAD_TOKEN", "That verification link is invalid or expired.", 400);
    }
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null, verifyTokenExp: null },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "auth.email_verified" } });
    return ok({ verified: true });
  } catch (e) {
    return fail(e);
  }
}
