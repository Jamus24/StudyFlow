import "server-only";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-2.0-flash";

async function gemini(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  opts: { temperature?: number } = {}
): Promise<string> {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY;

  const contents = [
    { role: "user", parts: [{ text: "[System Instructions]\n" + system }] },
    { role: "model", parts: [{ text: "Understood. I will follow these instructions." }] },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Gemini API error " + res.status + ": " + err);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function chatJSON(
  system: string,
  user: string,
  opts: { temperature?: number } = {}
): Promise<string> {
  return gemini(system, [{ role: "user", content: user }], opts);
}

export function extractJSON<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  let s = raw.trim();
  const fence = s.match(/`(?:json)?\s*([\s\S]*?)`/i);
  if (fence) s = fence[1].trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  const firstArr = s.indexOf("[");
  if (first !== -1 && last !== -1) {
    s = s.slice(first, last + 1);
  } else if (firstArr !== -1) {
    const end = s.lastIndexOf("]");
    if (end !== -1) s = s.slice(firstArr, end + 1);
  }
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export interface PlanDay {
  day: string;
  focus: string;
  blocks: {
    time: string;
    durationMin: number;
    subject: string;
    activity: string;
    type: "study" | "review" | "practice" | "break" | "exam";
  }[];
}

export interface GeneratedPlan {
  title: string;
  summary: string;
  weeklyMinutes: number;
  principles: string[];
  days: PlanDay[];
  tips: string[];
}

export async function generateStudyPlan(input: {
  goal: string;
  subjects: { name: string; examDate?: string; targetGrade?: string }[];
  horizon: "week" | "month" | "exam";
  hoursPerWeek: number;
  level?: string;
  weaknesses?: string;
}): Promise<GeneratedPlan> {
  const system = "You are Study Flow's study architect. Return ONLY a JSON object with: title, summary, weeklyMinutes, principles (string[]), days (array of {day, focus, blocks: [{time, durationMin, subject, activity, type}]}), tips (string[]). No prose, no code fences. Prefer active practice. Avoid cliches.";
  const user = "Goal: " + input.goal + " Horizon: " + input.horizon + " Hours/week: " + input.hoursPerWeek + " Level: " + (input.level ?? "high school") + " Subjects: " + input.subjects.map(s => s.name).join(", ") + " Weaknesses: " + (input.weaknesses || "none")";
  const raw = await chatJSON(system, user, { temperature: 0.7 });
  const parsed = extractJSON<GeneratedPlan>(raw);
  if (parsed && parsed.days) return parsed;
  return { title: input.horizon + " plan", summary: "A balanced study plan.", weeklyMinutes: input.hoursPerWeek * 60, principles: ["Active recall", "Spaced repetition"], days: [{ day: "Mon", focus: "Study", blocks: [{ time: "16:00", durationMin: 45, subject: input.subjects[0]?.name ?? "Study", activity: "Active recall", type: "practice" }] }], tips: ["Review regularly"] };
}

export interface FlashcardSet {
  cards: { front: string; back: string }[];
}

export async function generateFlashcards(input: {
  source: string;
  count: number;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<FlashcardSet> {
  const system = "You create flashcards. Return ONLY JSON: { cards: [{ front, back }] }. Make " + input.count + " cards. Difficulty: " + (input.difficulty ?? "medium") + ".";
  const raw = await chatJSON(system, "Source:\n\n" + input.source.slice(0, 8000), { temperature: 0.5 });
  const parsed = extractJSON<FlashcardSet>(raw);
  return parsed && parsed.cards?.length ? parsed : { cards: [] };
}

export async function summarizeNote(content: string): Promise<string> {
  return (await chatJSON("Summarize notes into 3-5 bullet points, each under 12 words. No fluff.", content.slice(0, 8000), { temperature: 0.4 })).trim();
}

export async function tutorReply(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  subject?: string;
  studentLevel?: string;
}): Promise<string> {
  const system = "You are Study Flow AI tutor. Be clear, give examples, ask check questions. Level: " + (input.studentLevel ?? "high school") + ". Subject: " + (input.subject ?? "general") + ". Keep under 220 words. Be specific.";
  return gemini(system, input.messages, { temperature: 0.6 });
}

export async function suggestTitle(text: string): Promise<string> {
  const raw = await chatJSON("Return a short title (max 6 words, Title Case). No quotes.", text.slice(0, 1200), { temperature: 0.3 });
  return raw.replace(/["'.]/g, "").trim().slice(0, 60) || "Untitled note";
}

export async function weeklyInsights(input: {
  minutes: number;
  tasksDone: number;
  topSubject: string;
  goalMin: number;
}): Promise<string> {
  return (await chatJSON("Write a 2-3 sentence coaching insight with one specific suggestion. No emoji.", "Minutes: " + input.minutes + " (goal " + input.goalMin + "). Tasks done: " + input.tasksDone + ". Top subject: " + input.topSubject, { temperature: 0.5 })).trim();
}