import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { z } from "zod";

// GET /api/groups/[id]/messages – list messages (paginated, newest last)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;

    const membership = await db.groupMember.findFirst({ where: { groupId: id, userId: user.id } });
    if (!membership) throw new ApiError("FORBIDDEN", "You're not a member of this group.", 403);

    const url = new URL(req.url);
    const before = url.searchParams.get("before"); // cursor (message id)
    const limit = Math.min(50, parseInt(url.searchParams.get("limit") || "30", 10));

    const messages = await db.groupMessage.findMany({
      where: { groupId: id, ...(before ? { id: { lt: before } } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // reverse so oldest is first for display
    return ok({ messages: messages.reverse(), hasMore: messages.length === limit });
  } catch (e) {
    return fail(e);
  }
}

const messageSchema = z.object({
  content: z.string().min(1, "Message can't be empty").max(2000, "Message too long"),
});

// POST /api/groups/[id]/messages – send a message
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;

    const membership = await db.groupMember.findFirst({ where: { groupId: id, userId: user.id } });
    if (!membership) throw new ApiError("FORBIDDEN", "You're not a member of this group.", 403);

    const body = await req.json().catch(() => ({}));
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check your message", 400, parseZodError(parsed.error));

    const message = await db.groupMessage.create({
      data: {
        groupId: id,
        userId: user.id,
        content: parsed.data.content.trim(),
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return ok({ message });
  } catch (e) {
    return fail(e);
  }
}
