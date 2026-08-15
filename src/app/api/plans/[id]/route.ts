import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const plan = await db.studyPlan.findFirst({ where: { id, userId: user.id } });
    if (!plan) throw new ApiError("NOT_FOUND", "Plan not found.", 404);
    return ok({ plan, content: JSON.parse(plan.content) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const plan = await db.studyPlan.findFirst({ where: { id, userId: user.id } });
    if (!plan) throw new ApiError("NOT_FOUND", "Plan not found.", 404);
    await db.studyPlan.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
