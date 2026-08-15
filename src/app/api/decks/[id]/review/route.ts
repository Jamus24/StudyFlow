import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

// SM-2 lite scheduling
function scheduleSM2(quality: 0 | 1 | 2 | 3, card: { ease: number; interval: number; reps: number }) {
  let ease = card.ease;
  let interval = card.interval;
  let reps = card.reps;
  if (quality < 2) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(interval * ease);
    ease = Math.max(1.3, ease + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02)));
  }
  const dueAt = new Date(Date.now() + interval * 864e5);
  return { ease, interval, reps, dueAt };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;
    const { quality, front, back } = await req.json().catch(() => ({}));

    // optional: add a card inline
    if (front && back) {
      const card = await db.flashcard.create({ data: { deckId: id, front, back } });
      return ok({ card });
    }

    const card = await db.flashcard.findFirst({
      where: { deckId: id, dueAt: { lte: new Date() } },
      orderBy: { dueAt: "asc" },
    });
    if (!card) return ok({ card: null, done: true });

    if (quality !== undefined) {
      const q = Math.max(0, Math.min(3, Number(quality))) as 0 | 1 | 2 | 3;
      const next = scheduleSM2(q, { ease: card.ease, interval: card.interval, reps: card.reps });
      const updated = await db.flashcard.update({
        where: { id: card.id },
        data: { ...next, lastReview: new Date() },
      });
      return ok({ card: updated, reviewed: true });
    }
    return ok({ card });
  } catch (e) {
    return fail(e);
  }
}
