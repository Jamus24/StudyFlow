import "server-only";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-3.6-flash";

async function gemini(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  opts: { temperature?: number } = {}
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta2/interactions`;
  const input: { type: string; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      input.push({ type: "user_input", content: m.content });
    } else {
      input.push({ type: "model_output", content: m.content });
    }
  }
  const body: Record<string, unknown> = {
    model: GEMINI_MODEL,
    system_instruction: system,
    input: input.length === 1 ? input[0].content : input,
    store: false,
    generation_config: { temperature: opts.temperature ?? 0.7 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  if (data?.output_text) return data.output_text as string;
  if (data?.candidates?.[0]?.content?.parts?.[0]?.text)
    return data.candidates[0].content.parts[0].text as string;
  if (data?.response?.candidates?.[0]?.content?.parts?.[0]?.text)
    return data.response.candidates[0].content.parts[0].text as string;
  return "";
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
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
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
  try { return JSON.parse(s) as T; } catch { return null; }
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
  const system = `You are Study Flow's study architect. Return ONLY a JSON object with this exact shape:
{"title":string,"summary":string,"weeklyMinutes":number,"principles":string[],"days":[{"day":"Mon","focus":string,"blocks":[{"time":"HH:MM","durationMin":number,"subject":string,"activity":string,"type":"study|review|practice|break|exam"}]}],"tips":string[]}
Rules: distribute weekly minutes across days. Include short breaks. Prefer active practice.`;
  const user = `Goal: ${input.goal}\nHorizon: ${input.horizon}\nHours/week: ${input.hoursPerWeek}\nLevel: ${input.level ?? "high school"}\nSubjects:\n${input.subjects.map(s => `- ${s.name}${s.examDate ? ` (exam ${s.examDate})` : ""}${s.targetGrade ? ` target ${s.targetGrade}` : ""}`).join("\n")}\nWeak areas: ${input.weaknesses || "none"}`;
  const raw = await chatJSON(system, user, { temperature: 0.7 });
  const parsed = extractJSON<GeneratedPlan>(raw);
  if (parsed && parsed.days) return parsed;
  return { title: `${input.horizon} plan`, summary: "Balanced plan.", weeklyMinutes: input.hoursPerWeek * 60, principles: ["Active recall", "Spaced repetition"], days: [{ day: "Mon", focus: "Study", blocks: [{ time: "16:00", durationMin: 45, subject: input.subjects[0]?.name ?? "Study", activity: "Practice", type: "practice" }] }], tips: ["Teach concepts aloud"] };
}

export interface FlashcardSet {
  cards: { front: string; back: string }[];
}

export async function generateFlashcards(input: {
  source: string;
  count: number;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<FlashcardSet> {
  const system = `Return ONLY JSON: {"cards":[{"front":"question","back":"answer (<240 chars)"}]} Make ${input.count} cards. Difficulty: ${input.difficulty ?? "medium"}.`;
  const raw = await chatJSON(system, `Source:\n${input.source.slice(0, 8000)}`, { temperature: 0.5 });
  const parsed = extractJSON<FlashcardSet>(raw);
  return parsed && parsed.cards?.length ? parsed : { cards: [] };
}

export async function summarizeNote(content: string): Promise<string> {
  const system = "Summarize into 3-5 bullet points, each under 12 words. No headings, no fluff.";
  return (await chatJSON(system, content.slice(0, 8000), { temperature: 0.4 })).trim();
}

export async function tutorReply(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  subject?: string;
  studentLevel?: string;
}): Promise<string> {
  const system = `You are Study Flow, an AI tutor. Level: ${input.studentLevel ?? "high school"}. Subject: ${input.subject ?? "general"}. Explain clearly with an example, then check understanding. Under 220 words. No cliches.`;
  return gemini(system, input.messages, { temperature: 0.6 });
}

export async function suggestTitle(text: string): Promise<string> {
  const raw = await chatJSON("Return a short title (max 6 words, Title Case, no quotes).", text.slice(0, 1200), { temperature: 0.3 });
  return raw.replace(/["'.]/g, "").trim().slice(0, 60) || "Untitled note";
}

export async function weeklyInsights(input: {
  minutes: number;
  tasksDone: number;
  topSubject: string;
  goalMin: number;
}): Promise<string> {
  const user = `Minutes studied: ${input.minutes} (goal ${input.goalMin}). Tasks done: ${input.tasksDone}. Top subject: ${input.topSubject}.`;
  return (await chatJSON("Write a 2-3 sentence insight with one specific suggestion. No emoji, no cliches.", user, { temperature: 0.5 })).trim();
}