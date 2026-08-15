import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

const CHALLENGE_TYPES = [
  { type: "study_minutes", target: 30, points: 50, label: "Study 30 minutes today", icon: "clock" },
  { type: "study_minutes", target: 60, points: 100, label: "Study 60 minutes today", icon: "clock" },
  { type: "complete_tasks", target: 2, points: 60, label: "Complete 2 tasks today", icon: "check" },
  { type: "complete_tasks", target: 5, points: 120, label: "Complete 5 tasks today", icon: "check" },
  { type: "review_cards", target: 10, points: 80, label: "Review 10 flashcards today", icon: "layers" },
  { type: "quiz_score", target: 70, points: 100, label: "Score 70%+ on a quiz today", icon: "brain" },
];

// Deterministic daily challenge (same for all users on a given day, based on date hash)
function getTodaysChallenge(dateStr: string) {
  // hash the date to pick a consistent challenge
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % CHALLENGE_TYPES.length;
  return CHALLENGE_TYPES[idx];
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const today = new Date().toISOString().slice(0, 10);
    const challengeDef = getTodaysChallenge(today);

    // get or create today's challenge
    let challenge = await db.dailyChallenge.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });

    if (!challenge) {
      challenge = await db.dailyChallenge.create({
        data: {
          userId: user.id,
          date: today,
          type: challengeDef.type,
          target: challengeDef.target,
          points: challengeDef.points,
        },
      });
    }

    // compute progress based on challenge type
    let progress = 0;
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    if (challenge.type === "study_minutes") {
      const agg = await db.studySession.aggregate({
        where: { userId: user.id, startedAt: { gte: dayStart } },
        _sum: { durationMin: true },
      });
      progress = agg._sum.durationMin ?? 0;
    } else if (challenge.type === "complete_tasks") {
      progress = await db.task.count({
        where: { userId: user.id, status: "done", updatedAt: { gte: dayStart } },
      });
    } else if (challenge.type === "review_cards") {
      // count flashcards reviewed today (lastReview on or after dayStart)
      progress = await db.flashcard.count({
        where: { deck: { userId: user.id }, lastReview: { gte: dayStart } },
      });
    } else if (challenge.type === "quiz_score") {
      // check if any quiz today scored >= target
      const quizzes = await db.quizResult.findMany({
        where: { userId: user.id, createdAt: { gte: dayStart } },
        select: { scorePct: true },
      });
      const best = quizzes.length > 0 ? Math.max(...quizzes.map((q) => q.scorePct)) : 0;
      progress = best;
    }

    progress = Math.min(progress, challenge.target);
    const completed = progress >= challenge.target;

    // auto-complete + award points if just reached
    if (completed && !challenge.completed) {
      await db.dailyChallenge.update({
        where: { id: challenge.id },
        data: { progress, completed: true },
      });
      await db.notification.create({
        data: {
          userId: user.id,
          type: "social",
          title: "Daily challenge complete!",
          body: `You earned ${challenge.points} bonus points.`,
          link: "dashboard",
        },
      });
      await db.activityLog.create({
        data: { userId: user.id, action: "challenge.completed", meta: `${challenge.type} +${challenge.points}pts` },
      });
    } else if (progress !== challenge.progress) {
      // update progress
      await db.dailyChallenge.update({
        where: { id: challenge.id },
        data: { progress },
      });
    }

    // get streak of completed daily challenges
    const recentChallenges = await db.dailyChallenge.findMany({
      where: { userId: user.id, completed: true },
      orderBy: { date: "desc" },
      take: 30,
      select: { date: true },
    });
    let challengeStreak = 0;
    let cursor = new Date();
    const completedDates = new Set(recentChallenges.map((c) => c.date));
    // allow today not yet completed
    if (!completedDates.has(today)) cursor = new Date(cursor.getTime() - 864e5);
    while (completedDates.has(cursor.toISOString().slice(0, 10))) {
      challengeStreak += 1;
      cursor = new Date(cursor.getTime() - 864e5);
    }

    return ok({
      challenge: {
        ...challenge,
        progress,
        completed,
        label: challengeDef.label,
        icon: challengeDef.icon,
      },
      challengeStreak,
      totalCompleted: recentChallenges.length,
    });
  } catch (e) {
    return fail(e);
  }
}
