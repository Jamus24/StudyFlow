import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError, parsePagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { page, pageSize, q } = parsePagination(req);
    const [items, total] = await Promise.all([
      db.activityLog.findMany({
        where: { userId: user.id, ...(q ? { OR: [{ action: { contains: q } }, { meta: { contains: q } }] } : {}) },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.activityLog.count({ where: { userId: user.id } }),
    ]);
    return ok({ items, page, pageSize, total });
  } catch (e) {
    return fail(e);
  }
}
