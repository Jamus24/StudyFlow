import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  description: z.string().max(400).optional(),
  color: z.string().max(20).default("#2563eb"),
  isPublic: z.boolean().default(false),
});

function genInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    const memberships = await db.groupMember.findMany({
      where: { userId: user.id },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return ok({ groups: memberships.map((m) => ({ ...m.group, role: m.role, memberCount: m.group._count.members })) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the group details", 400, parseZodError(parsed.error));

    const { name, description, color, isPublic } = parsed.data;
    let inviteCode = genInviteCode();
    // ensure uniqueness
    while (await db.studyGroup.findUnique({ where: { inviteCode } })) {
      inviteCode = genInviteCode();
    }

    const group = await db.studyGroup.create({
      data: {
        name,
        description,
        color,
        isPublic,
        inviteCode,
        members: {
          create: { userId: user.id, role: "owner" },
        },
      },
      include: { _count: { select: { members: true } } },
    });

    await db.activityLog.create({ data: { userId: user.id, action: "group.created", meta: name } });
    await db.notification.create({
      data: {
        userId: user.id,
        type: "social",
        title: "Group created",
        body: `Share invite code ${inviteCode} to invite study partners.`,
        link: "groups",
      },
    });

    return ok({ group: { ...group, role: "owner", memberCount: group._count.members } });
  } catch (e) {
    return fail(e);
  }
}
