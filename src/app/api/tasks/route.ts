import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError, parsePagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { url, q, sort, dir } = parsePagination(req);
    const status = url.searchParams.get("status") || undefined;
    const subjectId = url.searchParams.get("subjectId") || undefined;
    const priority = url.searchParams.get("priority") || undefined;
    const tasks = await db.task.findMany({
      where: {
        userId: user.id,
        ...(status ? { status } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(priority ? { priority } : {}),
        ...(q ? { title: { contains: q } } : {}),
      },
      orderBy: [{ order: "asc" }, { createdAt: dir }],
      include: { subject: { select: { id: true, name: true, color: true } } },
    });
    return ok({ tasks });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.task.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the task", 400, parseZodError(parsed.error));
    const data = {
      ...parsed.data,
      userId: user.id,
      subjectId: parsed.data.subjectId || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null,
    };
    const task = await db.task.create({ data });
    await db.activityLog.create({ data: { userId: user.id, action: "task.created", meta: task.title } });
    return ok({ task });
  } catch (e) {
    return fail(e);
  }
}
