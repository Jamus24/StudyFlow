import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new ApiError("NOT_FOUND", "Ticket not found.", 404);
    const updated = await db.supportTicket.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
      },
    });
    return ok({ ticket: updated });
  } catch (e) {
    return fail(e);
  }
}
