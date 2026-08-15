import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError, parsePagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { q } = parsePagination(req);
    const subjects = await db.subject.findMany({
      where: {
        userId: user.id,
        archived: false,
        ...(q ? { name: { contains: q } } : {}),
      },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { tasks: true, sessions: true, decks: true } },
      },
    });
    return ok({ subjects });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.subject.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the fields", 400, parseZodError(parsed.error));
    const max = await db.subject.count({ where: { userId: user.id } });
    const subject = await db.subject.create({
      data: {
        ...parsed.data,
        examDate: parsed.data.examDate ? new Date(parsed.data.examDate) : null,
        userId: user.id,
        order: max,
      },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "subject.created", meta: subject.name } });
    return ok({ subject });
  } catch (e) {
    return fail(e);
  }
}
