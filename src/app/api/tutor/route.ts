import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { tutorReply } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const threads = await db.tutorThread.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
    return ok({ threads });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const rl = await rateLimit({ key: "tutor", limit: 20, windowMs: 60000 });
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "You're chatting fast – give it a few seconds.", 429);

    const body = await req.json().catch(() => ({}));
    const parsed = schemas.tutor.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check your message", 400, parseZodError(parsed.error));

    let thread = parsed.data.threadId
      ? await db.tutorThread.findFirst({ where: { id: parsed.data.threadId, userId: user.id }, include: { messages: { orderBy: { createdAt: "asc" } } } })
      : null;
    if (!thread) {
      const title = parsed.data.message.slice(0, 40) + (parsed.data.message.length > 40 ? "…" : "");
      thread = await db.tutorThread.create({
        data: {
          userId: user.id,
          title,
          subjectId: parsed.data.subjectId || null,
          messages: { create: [] },
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    const subject = thread.subjectId
      ? await db.subject.findUnique({ where: { id: thread.subjectId } })
      : null;

    await db.tutorMessage.create({ data: { threadId: thread.id, role: "user", content: parsed.data.message } });

    const history = thread.messages.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    history.push({ role: "user", content: parsed.data.message });

    const reply = await tutorReply({
      messages: history,
      subject: subject?.name,
      studentLevel: user.grade || undefined,
    });

    const assistant = await db.tutorMessage.create({ data: { threadId: thread.id, role: "assistant", content: reply } });
    await db.tutorThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
    await db.activityLog.create({ data: { userId: user.id, action: "tutor.message", meta: thread.title } });

    return ok({ threadId: thread.id, message: assistant });
  } catch (e) {
    return fail(e);
  }
}
