import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, ApiError, parsePagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { page, pageSize, q, url } = parsePagination(req);
    const tier = url.searchParams.get("tier") || undefined;
    const role = url.searchParams.get("role") || undefined;
    const where = {
      ...(tier ? { planTier: tier } : {}),
      ...(role ? { role } : {}),
      ...(q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {}),
    };
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, email: true, name: true, role: true, planTier: true, planStatus: true, createdAt: true, lastActiveAt: true, emailVerified: true },
      }),
      db.user.count({ where }),
    ]);
    return ok({ users, page, pageSize, total });
  } catch (e) {
    return fail(e);
  }
}
