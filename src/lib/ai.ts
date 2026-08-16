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
    if (m.role === "user") { input.push({ type: "user_input", content: m.content }); } else { input.push({ type: "model_output", content: m.content }); }
  }
  const body: Record<string, unknown> = { model: GEMINI_MODEL, system_instruction: system, input: input.length === 1 ? input[0].content : input, store: false, generation_config: { temperature: opts.temperature ?? 0.7 } };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY, "x-goog-api-key": GEMINI_API_KEY }, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.text(); throw new Error(`Gemini API error ${res.status}: ${err}`); }
  const data = await res.json();
  if (data?.output_text) return data.output_text as string;
  if (data?.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text as string;
  if (data?.response?.candidates?.[0]?.content?.parts?.[0]?.text) return data.response.candidates[0].content.parts[0].text as string;
  return "";
}

export async function chatJSON(system: string, user: string, opts: { temperature?: number } = {}): Promise<string> { return gemini(system, [{ role: "user", content: user }], opts); }

export function extractJSON<V = unknown>(raw: string): V | null { if (!raw) return null; let s = raw.trim(); const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fence) s = fence[1].trim(); const first = s.indexOf("{"); const last = s.lastIndexOf("}"); const firstArr = s.indexOf("["); if (first !== -1 && last !== -1) { s = s.slice(first, last + 1); } else if (firstArr !== -1) { const end = s.lastIndexOf("]"); if (end !== -1) s = s.slice(firstArr, end + 1); } try { return JSON.parse(s) as V; } catch { return null; } }
