import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const flags = await db.featureFlag.findMany({ orderBy: { createdAt: "asc" } });
    return ok({ flags });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const parsed = schemas.flag.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check the flag", 400, parseZodError(parsed.error));
    const flag = await db.featureFlag.create({ data: parsed.data });
    return ok({ flag });
  } catch (e) {
    return fail(e);
  }
}
