// Lumina — Feature tier gating system

export type Tier = "free" | "pro" | "scholar";
export type TierLevel = 0 | 1 | 2;

const TIER_LEVEL: Record<Tier, TierLevel> = {
  free: 0,
  pro: 1,
  scholar: 2,
};

/** Check if a user's tier meets or exceeds the required tier */
export function tierSatisfies(userTier: string, required: Tier): boolean {
  return (TIER_LEVEL[userTier as Tier] ?? 0) >= TIER_LEVEL[required];
}

/** Feature gating map — defines which tier each feature requires */
export const FEATURE_TIERS: Record<string, { tier: Tier; label: string }> = {
  // Pro features
  "ai-plans":       { tier: "pro",    label: "AI Study Plans" },
  "ai-tutor":       { tier: "pro",    label: "AI Tutor" },
  "ai-flashcards":  { tier: "pro",    label: "AI Flashcard Generation" },
  "unlimited-subjects": { tier: "pro", label: "Unlimited Subjects" },
  "note-summarize": { tier: "pro",    label: "AI Note Summaries" },
  "spaced-rep":     { tier: "pro",    label: "Spaced Repetition" },
  "weekly-insights":{ tier: "pro",    label: "Weekly AI Insights" },
  "analytics":      { tier: "pro",    label: "Full Analytics" },
  "weekly-review":  { tier: "pro",    label: "Weekly AI Review" },
  "data-export":    { tier: "pro",    label: "Data Export" },
  "smart-suggestions": { tier: "pro", label: "AI Smart Suggestions" },

  // Scholar features
  "exam-prep":      { tier: "scholar", label: "Exam Prep" },
  "mock-quiz":      { tier: "scholar", label: "Mock Quizzes" },
  "deep-analytics": { tier: "scholar", label: "Deep Focus Analytics" },
  "study-groups":   { tier: "scholar", label: "Study Groups" },
  "daily-challenge-ai": { tier: "scholar", label: "AI Daily Challenges" },
};

/** Map from app route → feature key for sidebar gating */
export const ROUTE_TIERS: Record<string, { tier: Tier; feature: string; label: string }> = {
  "plans":        { tier: "pro",    feature: "ai-plans",     label: "AI Plans" },
  "tutor":        { tier: "pro",    feature: "ai-tutor",     label: "AI Tutor" },
  "exam-prep":    { tier: "scholar", feature: "exam-prep",   label: "Exam Prep" },
  "quiz":         { tier: "scholar", feature: "mock-quiz",   label: "Mock Quiz" },
  "analytics":    { tier: "pro",    feature: "analytics",    label: "Analytics" },
  "weekly-review": { tier: "pro",   feature: "weekly-review",label: "Weekly Review" },
  "groups":       { tier: "scholar", feature: "study-groups", label: "Study Groups" },
};

/** Tier limits for free users */
export const FREE_LIMITS = {
  maxSubjects: 4,
  maxPlansPerWeek: 1,
  maxDecks: 3,
} as const;
