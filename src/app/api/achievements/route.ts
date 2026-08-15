import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

interface BadgeDef {
  key: string;
  label: string;
  description: string;
  icon: string; // emoji or lucide name
  tier: "bronze" | "silver" | "gold" | "platinum";
  goal: number;
  metric: "sessions" | "minutes" | "tasks" | "streak" | "subjects" | "plans" | "decks" | "notes" | "tutor";
}

// Badge catalogue – order matters (display order)
const BADGES: BadgeDef[] = [
  { key: "first_session", label: "First Steps", description: "Complete your first focus session", icon: "🌱", tier: "bronze", goal: 1, metric: "sessions" },
  { key: "sessions_10", label: "Getting Warmed Up", description: "Complete 10 study sessions", icon: "🔥", tier: "bronze", goal: 10, metric: "sessions" },
  { key: "sessions_50", label: "Dedicated", description: "Complete 50 study sessions", icon: "⚡", tier: "silver", goal: 50, metric: "sessions" },
  { key: "sessions_100", label: "Centurion", description: "Complete 100 study sessions", icon: "💯", tier: "gold", goal: 100, metric: "sessions" },
  { key: "minutes_500", label: "Bookworm", description: "Study for 500 total minutes", icon: "📚", tier: "bronze", goal: 500, metric: "minutes" },
  { key: "minutes_2000", label: "Deep Diver", description: "Study for 2,000 total minutes", icon: "🌊", tier: "silver", goal: 2000, metric: "minutes" },
  { key: "minutes_10000", label: "Marathon Mind", description: "Study for 10,000 total minutes", icon: "🏆", tier: "gold", goal: 10000, metric: "minutes" },
  { key: "tasks_10", label: "Taskmaster", description: "Complete 10 tasks", icon: "✅", tier: "bronze", goal: 10, metric: "tasks" },
  { key: "tasks_50", label: "Productivity Pro", description: "Complete 50 tasks", icon: "🎯", tier: "silver", goal: 50, metric: "tasks" },
  { key: "tasks_200", label: "Execution Machine", description: "Complete 200 tasks", icon: "⚙️", tier: "gold", goal: 200, metric: "tasks" },
  { key: "streak_3", label: "Habit Forming", description: "Maintain a 3-day streak", icon: "🔥", tier: "bronze", goal: 3, metric: "streak" },
  { key: "streak_7", label: "Week Warrior", description: "Maintain a 7-day streak", icon: "🗓️", tier: "silver", goal: 7, metric: "streak" },
  { key: "streak_30", label: "Unbreakable", description: "Maintain a 30-day streak", icon: "💎", tier: "platinum", goal: 30, metric: "streak" },
  { key: "subjects_3", label: "Well-Rounded", description: "Add 3 subjects", icon: "🎓", tier: "bronze", goal: 3, metric: "subjects" },
  { key: "subjects_5", label: "Polymath", description: "Add 5 subjects", icon: "🧠", tier: "silver", goal: 5, metric: "subjects" },
  { key: "plans_1", label: "Architect", description: "Generate your first AI study plan", icon: "📐", tier: "bronze", goal: 1, metric: "plans" },
  { key: "plans_5", label: "Master Planner", description: "Generate 5 AI study plans", icon: "🗺️", tier: "silver", goal: 5, metric: "plans" },
  { key: "decks_1", label: "Card Creator", description: "Create your first flashcard deck", icon: "🃏", tier: "bronze", goal: 1, metric: "decks" },
  { key: "decks_5", label: "Deck Builder", description: "Create 5 flashcard decks", icon: "🎴", tier: "silver", goal: 5, metric: "decks" },
  { key: "notes_10", label: "Note Taker", description: "Write 10 notes", icon: "📝", tier: "bronze", goal: 10, metric: "notes" },
  { key: "notes_50", label: "Scribe", description: "Write 50 notes", icon: "✒️", tier: "silver", goal: 50, metric: "notes" },
  { key: "tutor_1", label: "Curious Mind", description: "Ask the AI tutor your first question", icon: "🤖", tier: "bronze", goal: 1, metric: "tutor" },
  { key: "tutor_20", label: "Inquisitive", description: "Ask the tutor 20 questions", icon: "💭", tier: "silver", goal: 20, metric: "tutor" },
  { key: "challenge_3", label: "Daily Devotee", description: "Complete 3 daily challenges", icon: "🎯", tier: "bronze", goal: 3, metric: "challenges" },
  { key: "challenge_7", label: "Challenge Champion", description: "Complete 7 daily challenges", icon: "🏅", tier: "silver", goal: 7, metric: "challenges" },
  { key: "challenge_30", label: "Unstoppable", description: "Complete 30 daily challenges", icon: "👑", tier: "gold", goal: 30, metric: "challenges" },
  { key: "quiz_1", label: "First Try", description: "Complete your first quiz", icon: "❓", tier: "bronze", goal: 1, metric: "quizzes" },
  { key: "quiz_10", label: "Quiz Whiz", description: "Complete 10 quizzes", icon: "🧩", tier: "silver", goal: 10, metric: "quizzes" },
  { key: "quiz_perfect", label: "Perfectionist", description: "Score 100% on a quiz", icon: "💯", tier: "gold", goal: 1, metric: "perfect_quiz" },
  { key: "groups_1", label: "Social Scholar", description: "Join your first study group", icon: "👥", tier: "bronze", goal: 1, metric: "groups" },
  { key: "groups_3", label: "Community Builder", description: "Join 3 study groups", icon: "🌐", tier: "silver", goal: 3, metric: "groups" },
];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    // compute metrics in parallel
    const [sessions, tasksDone, totalMinutesAgg, subjects, plans, decks, notes, tutorMessages, streakRows, challengesCompleted, quizzesCompleted, perfectQuizzes, groupsJoined] = await Promise.all([
      db.studySession.count({ where: { userId: user.id } }),
      db.task.count({ where: { userId: user.id, status: "done" } }),
      db.studySession.aggregate({ where: { userId: user.id }, _sum: { durationMin: true } }),
      db.subject.count({ where: { userId: user.id, archived: false } }),
      db.studyPlan.count({ where: { userId: user.id } }),
      db.deck.count({ where: { userId: user.id } }),
      db.note.count({ where: { userId: user.id } }),
      db.tutorMessage.count({ where: { role: "user", thread: { userId: user.id } } }),
      db.dailyStat.findMany({ where: { userId: user.id, minutes: { gt: 0 } }, orderBy: { date: "asc" }, select: { date: true } }),
      db.dailyChallenge.count({ where: { userId: user.id, completed: true } }),
      db.quizResult.count({ where: { userId: user.id } }),
      db.quizResult.count({ where: { userId: user.id, scorePct: 100 } }),
      db.groupMember.count({ where: { userId: user.id } }),
    ]);

    const totalMinutes = totalMinutesAgg._sum.durationMin ?? 0;

    // compute current streak (consecutive days ending today/yesterday)
    const studiedDays = new Set(streakRows.map((s) => s.date));
    const todayKey = new Date().toISOString().slice(0, 10);
    let cursor = new Date();
    if (!studiedDays.has(todayKey)) cursor = new Date(cursor.getTime() - 864e5);
    let streak = 0;
    while (studiedDays.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor = new Date(cursor.getTime() - 864e5);
    }

    const metrics: Record<BadgeDef["metric"], number> = {
      sessions,
      minutes: totalMinutes,
      tasks: tasksDone,
      streak,
      subjects,
      plans,
      decks,
      notes,
      tutor: tutorMessages,
      challenges: challengesCompleted,
      quizzes: quizzesCompleted,
      perfect_quiz: perfectQuizzes > 0 ? 1 : 0,
      groups: groupsJoined,
    };

    // fetch already-unlocked badges
    const unlocked = await db.achievement.findMany({ where: { userId: user.id } });
    const unlockedMap = new Map(unlocked.map((a) => [a.key, a.unlockedAt]));

    // detect newly-unlocked badges
    const newlyUnlocked: string[] = [];
    const badges = BADGES.map((b) => {
      const value = metrics[b.metric];
      const progress = Math.min(100, Math.round((value / b.goal) * 100));
      const isUnlocked = value >= b.goal;
      const wasUnlocked = unlockedMap.has(b.key);
      if (isUnlocked && !wasUnlocked) newlyUnlocked.push(b.key);
      return {
        ...b,
        current: value,
        progress: isUnlocked ? 100 : progress,
        unlocked: isUnlocked,
        unlockedAt: unlockedMap.get(b.key) || null,
      };
    });

    // persist newly unlocked + create notifications
    if (newlyUnlocked.length) {
      const def = new Map(BADGES.map((b) => [b.key, b]));
      // SQLite doesn't support skipDuplicates in createMany; insert one by one.
      for (const k of newlyUnlocked) {
        try {
          await db.achievement.create({ data: { userId: user.id, key: k } });
        } catch {
          // already exists (race) – ignore
        }
      }
      await db.notification.createMany({
        data: newlyUnlocked.map((k) => ({
          userId: user.id,
          type: "social",
          title: "Badge unlocked",
          body: `You earned "${def.get(k)?.label}" – ${def.get(k)?.description}`,
          link: "achievements",
        })),
      });
      await db.activityLog.createMany({
        data: newlyUnlocked.map((k) => ({ userId: user.id, action: "achievement.unlocked", meta: k })),
      });

      // grant bonus streak freezes for streak milestones
      const freezeBadges: Record<string, number> = { streak_7: 1, streak_30: 3, streak_3: 0 };
      let bonusFreezes = 0;
      for (const k of newlyUnlocked) {
        if (freezeBadges[k]) bonusFreezes += freezeBadges[k];
      }
      if (bonusFreezes > 0) {
        await db.user.update({
          where: { id: user.id },
          data: { freezeCount: { increment: bonusFreezes } },
        });
        await db.notification.create({
          data: {
            userId: user.id,
            type: "social",
            title: `+${bonusFreezes} streak freeze${bonusFreezes > 1 ? "s" : ""}`,
            body: `Reward for your streak – protect it on days you can't study.`,
            link: "dashboard",
          },
        });
      }
    }

    const unlockedCount = badges.filter((b) => b.unlocked).length;
    const tierCounts = {
      bronze: badges.filter((b) => b.unlocked && b.tier === "bronze").length,
      silver: badges.filter((b) => b.unlocked && b.tier === "silver").length,
      gold: badges.filter((b) => b.unlocked && b.tier === "gold").length,
      platinum: badges.filter((b) => b.unlocked && b.tier === "platinum").length,
    };

    return ok({
      badges,
      unlockedCount,
      totalBadges: BADGES.length,
      tierCounts,
      metrics,
      streak,
      newlyUnlocked,
    });
  } catch (e) {
    return fail(e);
  }
}
