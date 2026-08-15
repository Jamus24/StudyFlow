import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { generateStudyPlan } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const plans = await db.studyPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return ok({ plans });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const rl = await rateLimit({ key: "plan", limit: 10, windowMs: 60000 });
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Slow down – generating plans takes a moment.", 429);

    const body = await req.json().catch(() => ({}));
    const parsed = schemas.plan.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check your plan request", 400, parseZodError(parsed.error));

    const subjects = parsed.data.subjectIds?.length
      ? await db.subject.findMany({ where: { id: { in: parsed.data.subjectIds }, userId: user.id } })
      : await db.subject.findMany({ where: { userId: user.id, archived: false } });

    const plan = await generateStudyPlan({
      goal: parsed.data.goal,
      horizon: parsed.data.horizon,
      hoursPerWeek: parsed.data.hoursPerWeek,
      level: parsed.data.level || user.grade || undefined,
      weaknesses: parsed.data.weaknesses,
      subjects: subjects.map((s) => ({
        name: s.name,
        examDate: s.examDate?.toISOString().slice(0, 10),
        targetGrade: s.targetGrade || undefined,
      })),
    });

    const days = plan.days.length || 7;
    const endDate = new Date(Date.now() + days * 864e5);
    const saved = await db.studyPlan.create({
      data: {
        userId: user.id,
        title: plan.title,
        goal: parsed.data.goal,
        horizon: parsed.data.horizon,
        endDate,
        promptSummary: plan.summary,
        content: JSON.stringify(plan),
      },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "plan.generated", meta: plan.title } });
    return ok({ plan: saved, generated: plan });
  } catch (e) {
    return fail(e);
  }
}
