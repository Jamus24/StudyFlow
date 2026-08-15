import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { summarizeNote } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const rl = await rateLimit({ key: "summarize", limit: 15, windowMs: 60000 });
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Slow down a moment.", 429);
    const { id } = await params;
    const note = await db.note.findFirst({ where: { id, userId: user.id } });
    if (!note) throw new ApiError("NOT_FOUND", "Note not found.", 404);
    if (!note.content || note.content.length < 40) throw new ApiError("TOO_SHORT", "Add more to the note first.", 400);
    const summary = await summarizeNote(note.content);
    await db.note.update({ where: { id }, data: { summary } });
    return ok({ summary });
  } catch (e) {
    return fail(e);
  }
}
