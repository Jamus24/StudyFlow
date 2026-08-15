import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { z } from "zod";

const reflectSchema = z.object({
  note: z.string().max(1000).optional(),
  focusScore: z.number().int().min(1).max(100).optional(),
});

// PATCH /api/sessions/[id]/reflect – add a reflection (note + focus score) to a session
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = reflectSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check your reflection", 400, parseZodError(parsed.error));

    const session = await db.studySession.findFirst({ where: { id, userId: user.id } });
    if (!session) throw new ApiError("NOT_FOUND", "Session not found.", 404);

    const updated = await db.studySession.update({
      where: { id },
      data: {
        ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
        ...(parsed.data.focusScore !== undefined ? { focusScore: parsed.data.focusScore } : {}),
      },
    });

    return ok({ session: updated });
  } catch (e) {
    return fail(e);
  }
}
