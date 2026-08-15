import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  grade: z.string().max(40).optional(),
  weeklyGoalMin: z.number().int().min(60).max(3000).optional(),
  subjects: z.array(z.object({
    name: z.string().min(1).max(60),
    color: z.string().max(20),
    targetGrade: z.string().max(12).optional(),
  })).max(12).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check your details", 400);
    const { grade, weeklyGoalMin, subjects } = parsed.data;

    await db.user.update({
      where: { id: user.id },
      data: {
        ...(grade !== undefined ? { grade } : {}),
        ...(weeklyGoalMin !== undefined ? { weeklyGoalMin } : {}),
        onboarded: true,
      },
    });

    if (subjects?.length) {
      // create subjects with incrementing order
      for (let i = 0; i < subjects.length; i++) {
        await db.subject.create({
          data: {
            userId: user.id,
            name: subjects[i].name,
            color: subjects[i].color,
            targetGrade: subjects[i].targetGrade || null,
            order: i,
          },
        });
      }
      await db.activityLog.create({ data: { userId: user.id, action: "subject.bulk_created", meta: `${subjects.length} subjects` } });
    }
    await db.activityLog.create({ data: { userId: user.id, action: "onboard.completed" } });
    await db.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "You're set up",
        body: "Generate your first AI study plan whenever you're ready.",
        link: "plans",
      },
    });

    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
