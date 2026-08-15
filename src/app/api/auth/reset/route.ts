import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json().catch(() => ({}));
    if (!token || !password || password.length < 8) {
      throw new ApiError("VALIDATION", "Provide a valid token and a password of 8+ characters.", 400);
    }
    const user = await db.user.findFirst({ where: { resetToken: token } });
    if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
      throw new ApiError("BAD_TOKEN", "That reset link is invalid or expired.", 400);
    }
    const hash = await hashPassword(password);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, resetToken: null, resetTokenExp: null },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "auth.password_reset" } });
    await setSession({ sub: user.id, email: user.email, role: user.role });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
