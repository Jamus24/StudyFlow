import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const allowed: Record<string, unknown> = {};
    if (body.role) allowed.role = body.role;
    if (body.planTier) allowed.planTier = body.planTier;
    if (body.planStatus) allowed.planStatus = body.planStatus;
    if (body.emailVerified !== undefined) allowed.emailVerified = !!body.emailVerified;
    const user = await db.user.update({ where: { id }, data: allowed, select: { id: true, email: true, name: true, role: true, planTier: true, planStatus: true, emailVerified: true } });
    return ok({ user });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    if (id === admin.id) throw new ApiError("SELF_DELETE", "You can't delete your own admin account here.", 400);
    await db.user.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
