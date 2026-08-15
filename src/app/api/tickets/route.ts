import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { schemas } from "@/lib/validation";
import { ok, fail, ApiError, parseZodError } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const tickets = await db.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return ok({ tickets });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const reqBody = await req.json().catch(() => ({}));
    const parsed = schemas.ticket.safeParse(reqBody);
    if (!parsed.success) throw new ApiError("VALIDATION", "Check your message", 400, parseZodError(parsed.error));

    const bodyStr = parsed.data.body as string;
    const nameMatch = bodyStr.match(/^([^\(]+)\s*\(([^)]+)\)/);
    const submitterName = nameMatch?.[1]?.trim() || 'Anonymous';
    const submitterEmail = nameMatch?.[2]?.trim() || '';
    if (submitterName !== 'Anonymous' || submitterEmail) {
      console.log('[ticket] from:', submitterName, submitterEmail ? `<${submitterEmail}>` : '');
    }

    const ticket = await db.supportTicket.create({ data: { userId: user.id, ...parsed.data } });
    return ok({ ticket });
  } catch (e) {
    return fail(e);
  }
}
