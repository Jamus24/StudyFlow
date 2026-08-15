import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit({ key: "forgot", limit: 5, windowMs: 60000 });
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many requests. Wait a minute.", 429);
    const { email } = await req.json().catch(() => ({}));
    if (!email) throw new ApiError("VALIDATION", "Email is required.", 400);
    const user = await db.user.findUnique({ where: { email } });
    // always return ok to avoid email enumeration
    if (user) {
      const token = generateToken();
      await db.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExp: new Date(Date.now() + 3600 * 1000) },
      });
      // In production, email this link via Resend/SMTP:
      // sendEmail(user.email, "Reset your Study Flow password", `${BASE}/reset?token=${token}`)
      console.log(`[reset] token for ${email}: ${token}`);
    }
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
