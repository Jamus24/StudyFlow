import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

// GET /api/groups/[id] – group details + members + weekly leaderboard
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;

    const membership = await db.groupMember.findFirst({
      where: { groupId: id, userId: user.id },
    });
    if (!membership) throw new ApiError("FORBIDDEN", "You're not a member of this group.", 403);

    const group = await db.studyGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, planTier: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });
    if (!group) throw new ApiError("NOT_FOUND", "Group not found.", 404);

    // compute weekly minutes per member
    const weekStart = new Date(Date.now() - 7 * 864e5);
    const sessions = await db.studySession.findMany({
      where: { userId: { in: group.members.map((m) => m.userId) }, startedAt: { gte: weekStart } },
      select: { userId: true, durationMin: true },
    });
    const byUser = new Map<string, number>();
    for (const s of sessions) byUser.set(s.userId, (byUser.get(s.userId) ?? 0) + s.durationMin);

    const leaderboard = group.members
      .map((m) => ({
        ...m.user,
        role: m.role,
        minutes: byUser.get(m.userId) ?? 0,
        isYou: m.userId === user.id,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    return ok({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        inviteCode: group.inviteCode,
        isPublic: group.isPublic,
        createdAt: group.createdAt,
      },
      members: leaderboard,
      myRole: membership.role,
    });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { id } = await params;

    const membership = await db.groupMember.findFirst({
      where: { groupId: id, userId: user.id },
    });
    if (!membership) throw new ApiError("FORBIDDEN", "You're not a member.", 403);

    // owner leaving = delete group; member leaving = remove membership
    if (membership.role === "owner") {
      await db.studyGroup.delete({ where: { id } });
    } else {
      await db.groupMember.delete({ where: { id: membership.id } });
    }
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
