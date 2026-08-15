import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

// POST /api/groups/join – join a group by invite code
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { inviteCode } = await req.json().catch(() => ({}));
    if (!inviteCode || typeof inviteCode !== "string") {
      throw new ApiError("VALIDATION", "Provide an invite code.", 400);
    }

    const group = await db.studyGroup.findUnique({
      where: { inviteCode: inviteCode.toUpperCase().trim() },
    });
    if (!group) throw new ApiError("NOT_FOUND", "No group with that invite code.", 404);

    const existing = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
    });
    if (existing) throw new ApiError("ALREADY_MEMBER", "You're already in this group.", 400);

    await db.groupMember.create({
      data: { groupId: group.id, userId: user.id, role: "member" },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "group.joined", meta: group.name } });

    return ok({ group: { id: group.id, name: group.name, color: group.color } });
  } catch (e) {
    return fail(e);
  }
}
