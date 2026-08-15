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
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.note.partial().safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the note", 400, parseZodError(parsed.error));
    const existing = await db.note.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new ApiError("NOT_FOUND", "Note not found.", 404);
    const note = await db.note.update({
      where: { id },
      data: { ...parsed.data, subjectId: parsed.data.subjectId === undefined ? existing.subjectId : parsed.data.subjectId || null },
    });
    return ok({ note });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const note = await db.note.findFirst({ where: { id, userId: user.id } });
    if (!note) throw new ApiError("NOT_FOUND", "Note not found.", 404);
    await db.note.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
