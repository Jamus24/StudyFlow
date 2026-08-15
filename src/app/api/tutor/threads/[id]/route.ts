import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const thread = await db.tutorThread.findFirst({
      where: { id, userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } }, subject: { select: { name: true } } },
    });
    if (!thread) throw new ApiError("NOT_FOUND", "Thread not found.", 404);
    return ok({ thread });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const thread = await db.tutorThread.findFirst({ where: { id, userId: user.id } });
    if (!thread) throw new ApiError("NOT_FOUND", "Thread not found.", 404);
    await db.tutorThread.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
