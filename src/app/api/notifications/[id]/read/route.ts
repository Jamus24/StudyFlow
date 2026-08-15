import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const n = await db.notification.findFirst({ where: { id, userId: user.id } });
    if (!n) throw new ApiError("NOT_FOUND", "Notification not found.", 404);
    await db.notification.update({ where: { id }, data: { read: true } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
