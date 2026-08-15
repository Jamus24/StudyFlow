import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const session = await db.studySession.findFirst({ where: { id, userId: user.id } });
    if (!session) throw new ApiError("NOT_FOUND", "Session not found.", 404);
    const key = session.startedAt.toISOString().slice(0, 10);
    await db.studySession.delete({ where: { id } });
    await db.dailyStat.updateMany({
      where: { userId: user.id, date: key },
      data: { minutes: { decrement: session.durationMin }, sessions: { decrement: 1 } },
    });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
