import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const decks = await db.deck.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { subject: { select: { name: true, color: true } }, _count: { select: { cards: true } } },
    });
    return ok({ decks });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.deck.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the deck", 400, parseZodError(parsed.error));
    const deck = await db.deck.create({
      data: { ...parsed.data, subjectId: parsed.data.subjectId || null, userId: user.id },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "deck.created", meta: deck.name } });
    return ok({ deck });
  } catch (e) {
    return fail(e);
  }
}
