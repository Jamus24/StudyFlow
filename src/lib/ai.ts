import "server-only";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-2.0-flash";

async function gemini(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  opts: { temperature?: number } = {}
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Gemini uses "user" and "model" roles. We prepend system as a user message.
  const contents = [
    { role: "user", parts: [{ text: `[System Instructions]\n${system}` }] },
    { role: "model", parts: [{ text: "Understood. I will follow these instructions." }] },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
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
    throw new Error(`Gemini API error ${res.status}: ${err}`);
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

/* ---- Extract a JSON object from a possibly-noisy model reply ---- */
export function extractJSON<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  // strip code fences
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // find first { ... last }
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
  const system = `You are Study Flow's study architect, an expert at turning syllabi into focused, realistic study plans for students.
Return ONLY a JSON object (no prose, no code fences) with this exact shape:
{
  "title": string,
  "summary": string (2-3 sentences, specific & practical),
  "weeklyMinutes": number,
  "principles": string[] (3-5 concise study principles relevant to the goal),
  "days": [
    { "day": "Mon", "focus": string, "blocks": [
      { "time": "HH:MM", "durationMin": number, "subject": string, "activity": string, "type": "study|review|practice|break|exam" }
    ]}
  ],
  "tips": string[] (4-6 specific, non-generic study tips tied to the subjects)
}
Rules: distribute the weekly minutes across days. Use the student's stated hours per week. Include short breaks. Prefer active practice over passive re-reading. Avoid cliches like "unlock your potential".`;

  const user = `Goal: ${input.goal}
Horizon: ${input.horizon}
Available study time per week: ${input.hoursPerWeek} hours
Student level: ${input.level ?? "high school"}
Subjects:
${input.subjects
  .map(
    (s) =>
      `- ${s.name}${s.examDate ? ` (exam ${s.examDate})` : ""}${
        s.targetGrade ? ` target ${s.targetGrade}` : ""
      }`
  )
  .join("\n")}
Weak areas: ${input.weaknesses || "none specified"}`;

  const raw = await chatJSON(system, user, { temperature: 0.7 });
  const parsed = extractJSON<GeneratedPlan>(raw);
  if (parsed && parsed.days) return parsed;
  // fallback minimal plan
  return {
    title: `${input.horizon === "week" ? "Weekly" : input.horizon === "month" ? "Monthly" : "Exam"} plan - ${input.subjects[0]?.name ?? "Study"}`,
    summary:
      "A balanced plan mixing review, active practice, and spaced repetition across your subjects.",
    weeklyMinutes: input.hoursPerWeek * 60,
    principles: [
      "Active recall beats re-reading",
      "Space out reviews to strengthen memory",
      "Mix subjects to improve transfer",
    ],
    days: [
      {
        day: "Mon",
        focus: "Deep work",
        blocks: [
          { time: "16:00", durationMin: 45, subject: input.subjects[0]?.name ?? "Study", activity: "Active recall practice", type: "practice" },
          { time: "16:50", durationMin: 10, subject: "Break", activity: "Walk, hydrate", type: "break" },
        ],
      },
    ],
    tips: [
      "Write questions from your notes, then answer from memory",
      "Teach a concept aloud to spot gaps",
    ],
  };
}

export interface FlashcardSet {
  cards: { front: string; back: string }[];
}

export async function generateFlashcards(input: {
  source: string;
  count: number;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<FlashcardSet> {
  const system = `You are a spaced-repetition card author for students.
Return ONLY JSON (no prose, no fences): { "cards": [{ "front": string (a clear question or prompt), "back": string (concise answer, <240 chars) }] }
Rules: make ${input.count} cards. Fronts must be answerable without context. Prefer conceptual understanding over trivia. Difficulty: ${input.difficulty ?? "medium"}.`;
  const raw = await chatJSON(system, `Source material:\n\n${input.source.slice(0, 8000)}`, {
    temperature: 0.5,
  });
  const parsed = extractJSON<FlashcardSet>(raw);
  return parsed && parsed.cards?.length ? parsed : { cards: [] };
}

export async function summarizeNote(content: string): Promise<string> {
  const system =
    "You summarize student notes into tight, scannable summaries. Return 3-5 bullet points, each under 12 words, no headings, no fluff. Avoid cliches.";
  return (await chatJSON(system, content.slice(0, 8000), { temperature: 0.4 })).trim();
}

export async function tutorReply(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  subject?: string;
  studentLevel?: string;
}): Promise<string> {
  const system = `You are Study Flow, an encouraging but rigorous AI tutor for students.
- Explain concepts clearly with a concrete example, then check understanding with a small question.
- Adapt depth to the student's level: ${input.studentLevel ?? "high school"}.
- If the student is studying ${input.subject ?? "general topics"}, ground answers in that subject.
- Keep replies focused (under 220 words unless asked for depth). Use short paragraphs or bullets.
- Never invent citations. If unsure, say so and suggest a reliable way to verify.
- Don't use generic marketing phrases. Be specific and useful.`;
  return gemini(system, input.messages, { temperature: 0.6 });
}

export async function suggestTitle(text: string): Promise<string> {
  const system =
    "Return a short title (max 6 words, Title Case, no quotes, no punctuation at end) summarising this note.";
  const raw = await chatJSON(system, text.slice(0, 1200), { temperature: 0.3 });
  return raw.replace(/["'.]/g, "").trim().slice(0, 60) || "Untitled note";
}

export async function weeklyInsights(input: {
  minutes: number;
  tasksDone: number;
  topSubject: string;
  goalMin: number;
}): Promise<string> {
  const system =
    "You are Study Flow's coach. Given a student's weekly stats, write a 2-3 sentence insight with one specific, non-generic suggestion. No emoji. No cliches.";
  const user = `Minutes studied: ${input.minutes} (goal ${input.goalMin}). Tasks completed: ${input.tasksDone}. Most-studied subject: ${input.topSubject}.`;
  return (await chatJSON(system, user, { temperature: 0.5 })).trim();
}
