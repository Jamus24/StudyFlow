import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { z } from "zod";

const saveSchema = z.object({
  topic: z.string().min(1).max(200),
  subject: z.string().max(100).default("general"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  totalQuestions: z.number().int().min(1).max(20),
  correctCount: z.number().int().min(0).max(20),
  questions: z.string().max(50000), // JSON string
});

// POST /api/quiz/save – save a completed quiz result
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the result", 400, parseZodError(parsed.error));

    const { topic, subject, difficulty, totalQuestions, correctCount, questions } = parsed.data;
    const scorePct = Math.round((correctCount / totalQuestions) * 100);

    const result = await db.quizResult.create({
      data: {
        userId: user.id,
        topic,
        subject,
        difficulty,
        totalQuestions,
        correctCount,
        scorePct,
        questions,
      },
    });

    await db.activityLog.create({ data: { userId: user.id, action: "quiz.completed", meta: `${topic} · ${scorePct}%` } });

    return ok({ result });
  } catch (e) {
    return fail(e);
  }
}

// GET /api/quiz/save – list recent quiz results (history)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const results = await db.quizResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        topic: true,
        subject: true,
        difficulty: true,
        totalQuestions: true,
        correctCount: true,
        scorePct: true,
        createdAt: true,
      },
    });

    // compute stats
    const total = results.length;
    const avgScore = total > 0 ? Math.round(results.reduce((s, r) => s + r.scorePct, 0) / total) : 0;
    const passed = results.filter((r) => r.scorePct >= 70).length;
    const bestScore = total > 0 ? Math.max(...results.map((r) => r.scorePct)) : 0;

    return ok({ results, stats: { total, avgScore, passed, bestScore } });
  } catch (e) {
    return fail(e);
  }
}
