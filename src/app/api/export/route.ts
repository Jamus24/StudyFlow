import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

// GET /api/export – returns all user data as JSON for backup/transfer
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const [
      subjects, tasks, sessions, plans, notes, decks, threads,
      achievements, goals, notifications, activity, preferences,
    ] = await Promise.all([
      db.subject.findMany({ where: { userId: user.id } }),
      db.task.findMany({ where: { userId: user.id } }),
      db.studySession.findMany({ where: { userId: user.id } }),
      db.studyPlan.findMany({ where: { userId: user.id } }),
      db.note.findMany({ where: { userId: user.id } }),
      db.deck.findMany({ where: { userId: user.id }, include: { cards: true } }),
      db.tutorThread.findMany({ where: { userId: user.id }, include: { messages: true } }),
      db.achievement.findMany({ where: { userId: user.id } }),
      db.studyGoal.findMany({ where: { userId: user.id } }),
      db.notification.findMany({ where: { userId: user.id } }),
      db.activityLog.findMany({ where: { userId: user.id } }),
      db.userPreference.findUnique({ where: { userId: user.id } }),
    ]);

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        bio: user.bio,
        grade: user.grade,
        timezone: user.timezone,
        planTier: user.planTier,
        weeklyGoalMin: user.weeklyGoalMin,
        createdAt: user.createdAt,
      },
      subjects,
      tasks,
      sessions,
      plans,
      notes,
      decks,
      threads,
      achievements,
      goals,
      notifications,
      activity,
      preferences,
      stats: {
        totalSubjects: subjects.length,
        totalTasks: tasks.length,
        totalSessions: sessions.length,
        totalPlans: plans.length,
        totalNotes: notes.length,
        totalDecks: decks.length,
        totalCards: decks.reduce((s, d) => s + d.cards.length, 0),
        totalThreads: threads.length,
        totalAchievements: achievements.length,
      },
    };

    return ok(exportData);
  } catch (e) {
    return fail(e);
  }
}
