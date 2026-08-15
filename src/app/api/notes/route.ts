import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError, parsePagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { q, sort, dir } = parsePagination(req);
    const notes = await db.note.findMany({
      where: { userId: user.id, ...(q ? { OR: [{ title: { contains: q } }, { content: { contains: q } }] } : {}) },
      orderBy: [{ pinned: "desc" }, { createdAt: dir }],
      include: { subject: { select: { name: true, color: true } } },
    });
    return ok({ notes });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.note.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the note", 400, parseZodError(parsed.error));
    const note = await db.note.create({
      data: { ...parsed.data, subjectId: parsed.data.subjectId || null, userId: user.id },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "note.created", meta: note.title } });
    return ok({ note });
  } catch (e) {
    return fail(e);
  }
}
