import { cookies } from "next/headers";

/**
 * Simple in-memory rate limiter keyed by ip+route.
 * Works for single-instance deployments. For multi-instance, swap for Redis.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

async function clientIp(): Promise<string> {
  try {
    const store = await cookies();
    return store.get("x-forwarded-for")?.value || "anon";
  } catch {
    return "anon";
  }
}

export async function rateLimit(opts: {
  key?: string;
  limit?: number;
  windowMs?: number;
}): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const limit = opts.limit ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const ip = await clientIp();
  const k = `${ip}:${opts.key ?? "global"}`;
  const now = Date.now();
  const entry = buckets.get(k);
  if (!entry || entry.resetAt < now) {
    buckets.set(k, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (entry.count >= limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export async function resetRateLimit(key?: string) {
  const ip = await clientIp();
  buckets.delete(`${ip}:${key ?? "global"}`);
}
