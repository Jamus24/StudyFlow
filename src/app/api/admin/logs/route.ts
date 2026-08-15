import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, parsePagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { page, pageSize, q, url } = parsePagination(req);
    const level = url.searchParams.get("level") || undefined;
    const where = {
      ...(level ? { level } : {}),
      ...(q ? { message: { contains: q } } : {}),
    };
    const [logs, total] = await Promise.all([
      db.systemLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      db.systemLog.count({ where }),
    ]);
    return ok({ logs, page, pageSize, total });
  } catch (e) {
    return fail(e);
  }
}
