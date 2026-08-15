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
    const subject = await db.subject.findFirst({ where: { id, userId: user.id } });
    if (!subject) throw new ApiError("NOT_FOUND", "Subject not found.", 404);
    const parsed = schemas.subject.partial().safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the fields", 400, parseZodError(parsed.error));
    const updated = await db.subject.update({
      where: { id },
      data: {
        ...parsed.data,
        examDate: parsed.data.examDate ? new Date(parsed.data.examDate) : subject.examDate,
      },
    });
    return ok({ subject: updated });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const subject = await db.subject.findFirst({ where: { id, userId: user.id } });
    if (!subject) throw new ApiError("NOT_FOUND", "Subject not found.", 404);
    await db.subject.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
