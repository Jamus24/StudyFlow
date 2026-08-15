import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const existing = await db.task.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new ApiError("NOT_FOUND", "Task not found.", 404);
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.task.partial().safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the task", 400, parseZodError(parsed.error));

    const becameDone = parsed.data.status === "done" && existing.status !== "done";
    const task = await db.task.update({
      where: { id },
      data: {
        ...parsed.data,
        subjectId: parsed.data.subjectId === undefined ? existing.subjectId : parsed.data.subjectId || null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : parsed.data.dueDate === null ? null : existing.dueDate,
        scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : parsed.data.scheduledFor === null ? null : existing.scheduledFor,
      },
    });
    if (becameDone) {
      await db.activityLog.create({ data: { userId: user.id, action: "task.completed", meta: task.title } });
      const today = new Date().toISOString().slice(0, 10);
      await db.dailyStat.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        update: { tasksDone: { increment: 1 } },
        create: { userId: user.id, date: today, tasksDone: 1 },
      });
    }
    return ok({ task });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const task = await db.task.findFirst({ where: { id, userId: user.id } });
    if (!task) throw new ApiError("NOT_FOUND", "Task not found.", 404);
    await db.task.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
