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
    const parsed = schemas.flashcard.partial().safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the card", 400, parseZodError(parsed.error));
    const card = await db.flashcard.findUnique({ where: { id }, include: { deck: true } });
    if (!card || card.deck.userId !== user.id) throw new ApiError("NOT_FOUND", "Card not found.", 404);
    const updated = await db.flashcard.update({ where: { id }, data: parsed.data });
    return ok({ card: updated });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const card = await db.flashcard.findUnique({ where: { id }, include: { deck: true } });
    if (!card || card.deck.userId !== user.id) throw new ApiError("NOT_FOUND", "Card not found.", 404);
    await db.flashcard.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
