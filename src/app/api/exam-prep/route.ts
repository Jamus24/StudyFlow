import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { chatJSON } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/exam-prep – returns subjects with upcoming exams + AI prioritization
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 864e5);

    // subjects with exams in the next 30 days
    const subjects = await db.subject.findMany({
      where: {
        userId: user.id,
        archived: false,
        examDate: { gte: now, lte: next30Days },
      },
      orderBy: { examDate: "asc" },
      include: {
        _count: { select: { tasks: true, sessions: true } },
      },
    });

    if (subjects.length === 0) {
      return ok({ exams: [], message: "No upcoming exams in the next 30 days. Add exam dates to your subjects to get a prep plan." });
    }

    // compute days until each exam + study time invested per subject
    const enriched = await Promise.all(
      subjects.map(async (s) => {
        const daysUntil = Math.ceil((s.examDate!.getTime() - now.getTime()) / 864e5);
        const sessions = await db.studySession.aggregate({
          where: { subjectId: s.id, startedAt: { gte: new Date(now.getTime() - 14 * 864e5) } },
          _sum: { durationMin: true },
        });
        const recentMinutes = sessions._sum.durationMin ?? 0;
        const tasksOpen = await db.task.count({ where: { subjectId: s.id, status: { not: "done" } } });
        const tasksDone = await db.task.count({ where: { subjectId: s.id, status: "done" } });
        return {
          ...s,
          daysUntil,
          recentMinutes,
          tasksOpen,
          tasksDone,
          priority: daysUntil <= 3 ? "critical" : daysUntil <= 7 ? "high" : daysUntil <= 14 ? "medium" : "low",
        };
      })
    );

    // sort by days until exam (most urgent first)
    enriched.sort((a, b) => a.daysUntil - b.daysUntil);

    // AI prep strategy for the most urgent exam (rate-limited)
    const rl = rateLimit({ key: "exam-prep", limit: 10, windowMs: 60000 });
    let prepStrategy: { topics: { name: string; priority: string; estHours: number; reason: string }[]; tips: string[] } | null = null;
    if ((await rl).ok && enriched.length > 0) {
      try {
        const mostUrgent = enriched[0];
        const sys = `You are an exam prep strategist. Given a subject and days until the exam, return ONLY JSON: {"topics": [{"name": string, "priority": "critical"|"high"|"medium", "estHours": number, "reason": string (under 80 chars)}], "tips": [string (3-4 specific study tips, each under 60 chars)]}. Focus on high-yield topics. No clichés.`;
        const usr = `Subject: ${mostUrgent.name}. Days until exam: ${mostUrgent.daysUntil}. Target grade: ${mostUrgent.targetGrade || "B"}. Recent study: ${mostUrgent.recentMinutes}m in last 14 days. Open tasks: ${mostUrgent.tasksOpen}. Description: ${mostUrgent.description || "general"}.`;
        const raw = await chatJSON(sys, usr, { temperature: 0.6 });
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) prepStrategy = JSON.parse(match[0]);
      } catch {}
    }

    return ok({
      exams: enriched,
      prepStrategy: prepStrategy || null,
      urgentCount: enriched.filter((e) => e.priority === "critical" || e.priority === "high").length,
    });
  } catch (e) {
    return fail(e);
  }
}
