import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { generateFlashcards } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const rl = await rateLimit({ key: "flashgen", limit: 10, windowMs: 60000 });
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Slow down – card generation takes a moment.", 429);

    const body = await req.json().catch(() => ({}));
    const parsed = schemas.generateCards.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check your source", 400, parseZodError(parsed.error));
    const set = await generateFlashcards({
      source: parsed.data.source,
      count: parsed.data.count,
      difficulty: parsed.data.difficulty,
    });
    return ok({ cards: set.cards });
  } catch (e) {
    return fail(e);
  }
}
