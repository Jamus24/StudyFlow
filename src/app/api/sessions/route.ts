import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError, parsePagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { page, pageSize, q } = parsePagination(req);
    const where = {
      userId: user.id,
      ...(q ? { OR: [{ note: { contains: q } }, { subject: { name: { contains: q } } }] } : {}),
    };
    const [sessions, total] = await Promise.all([
      db.studySession.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { subject: { select: { name: true, color: true } }, task: { select: { title: true } } },
      }),
      db.studySession.count({ where }),
    ]);
    return ok({ sessions, page, pageSize, total });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.session.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the session", 400, parseZodError(parsed.error));
    const startedAt = parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date();
    const session = await db.studySession.create({
      data: {
        userId: user.id,
        subjectId: parsed.data.subjectId || null,
        taskId: parsed.data.taskId || null,
        durationMin: parsed.data.durationMin,
        focusScore: parsed.data.focusScore ?? null,
        note: parsed.data.note ?? null,
        mode: parsed.data.mode,
        startedAt,
        endedAt: new Date(startedAt.getTime() + parsed.data.durationMin * 60000),
      },
    });
    const key = startedAt.toISOString().slice(0, 10);
    await db.dailyStat.upsert({
      where: { userId_date: { userId: user.id, date: key } },
      update: { minutes: { increment: session.durationMin }, sessions: { increment: 1 } },
      create: { userId: user.id, date: key, minutes: session.durationMin, sessions: 1 },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "session.logged", meta: `${session.durationMin}m` } });
    return ok({ session });
  } catch (e) {
    return fail(e);
  }
}
