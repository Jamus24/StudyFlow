import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE = "lumina_session";
const REFRESH_COOKIE = "lumina_refresh";
const SECRET = process.env.JWT_SECRET || "lumina-dev-secret-change-me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "lumina-dev-refresh-secret";

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string;
  email: string;
  role: string;
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: SessionPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30m" });
}

export function signRefreshToken(payload: SessionPayload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string, refresh = false): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, refresh ? REFRESH_SECRET : SECRET) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function setSession(payload: SessionPayload) {
  const store = await cookies();
  const access = signAccessToken(payload);
  const refresh = signRefreshToken(payload);
  store.set(SESSION_COOKIE, access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30, // 30 min
  });
  store.set(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getCurrentUser() {
  try {
    const store = await cookies();
    const access = store.get(SESSION_COOKIE)?.value;
    const refresh = store.get(REFRESH_COOKIE)?.value;

    let payload: SessionPayload | null = null;
    if (access) payload = verifyToken(access);
    if (!payload && refresh) {
      payload = verifyToken(refresh, true);
      if (payload) {
        // rotate access token
        const newAccess = signAccessToken({
          sub: payload.sub,
          email: payload.email,
          role: payload.role,
        });
        store.set(SESSION_COOKIE, newAccess, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 30,
        });
      }
    }
    if (!payload) return null;

    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        bio: true,
        grade: true,
        timezone: true,
        planTier: true,
        planStatus: true,
        onboarded: true,
        weeklyGoalMin: true,
        trialEndsAt: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("FORBIDDEN");
  return u;
}

export function generateToken(length = 32) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
