import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { chatJSON } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const generateSchema = z.object({
  subjectId: z.string().optional(),
  topic: z.string().min(2).max(200),
  count: z.number().int().min(1).max(10).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

// POST /api/quiz – generate a mock quiz (AI-powered)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const rl = rateLimit({ key: "quiz", limit: 10, windowMs: 60000 });
    if (!(await rl).ok) throw new ApiError("RATE_LIMIT", "Slow down – quiz generation takes a moment.", 429);

    const body = await req.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check your quiz request", 400, parseZodError(parsed.error));

    const { subjectId, topic, count, difficulty } = parsed.data;

    // get subject context if provided
    let subjectName = "general";
    if (subjectId) {
      const subject = await db.subject.findFirst({ where: { id: subjectId, userId: user.id } });
      if (subject) subjectName = subject.name;
    }

    const system = `You are an expert exam writer. Generate a mock quiz for a student.
Return ONLY a JSON object (no prose, no code fences):
{
  "questions": [
    {
      "id": 1,
      "question": string (clear, specific question),
      "options": [string, string, string, string] (exactly 4 options),
      "correctIndex": number (0-3),
      "explanation": string (why the correct answer is right, under 120 chars),
      "topic": string (sub-topic this tests)
    }
  ]
}
Rules: exactly ${count} questions. Difficulty: ${difficulty}. Subject: ${subjectName}. Topic focus: ${topic}. Options should be plausible but only one correct. Explanations should be concise and educational.`;

    const raw = await chatJSON(system, `Generate ${count} ${difficulty} questions about "${topic}" for ${subjectName}.`)`

    // extract JSON from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new ApiError("AI_FAILED", "Could not generate quiz. Try again.", 500);
    const quiz = JSON.parse(match[0]);

    if (!quiz.questions || !Array.isArray(quiz.questions)) {
      throw new ApiError("AI_FAILED", "Quiz format was invalid. Try again.", 500);
    }

    await db.activityLog.create({ data: { userId: user.id, action: "quiz.generated", meta: `${topic} · ${count}q` } });

    return ok({
      quiz: {
        topic,
        subject: subjectName,
        difficulty,
        questions: quiz.questions.map((q: any, i: number) => ({
          ...q,
          id: q.id || i + 1,
        })),
      },
    });
  } catch (e) {
    return fail(e);
  }
}
