import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const deck = await db.deck.findFirst({
      where: { id, userId: user.id },
      include: { cards: { orderBy: { createdAt: "asc" } }, subject: { select: { name: true, color: true } } },
    });
    if (!deck) throw new ApiError("NOT_FOUND", "Deck not found.", 404);
    return ok({ deck });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.deck.partial().safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the deck", 400, parseZodError(parsed.error));
    const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
    if (!deck) throw new ApiError("NOT_FOUND", "Deck not found.", 404);
    const updated = await db.deck.update({ where: { id }, data: parsed.data });
    return ok({ deck: updated });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
    if (!deck) throw new ApiError("NOT_FOUND", "Deck not found.", 404);
    await db.deck.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
