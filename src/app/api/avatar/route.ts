import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("NO_FILE", "Choose an image first.", 400);
    if (file.size > 2 * 1024 * 1024) throw new ApiError("TOO_BIG", "Image must be under 2 MB.", 400);
    if (!ALLOWED.includes(file.type)) throw new ApiError("TYPE", "Use PNG, JPEG, WEBP or GIF.", 400);

    const dir = join(process.cwd(), "public", "uploads", "avatars");
    mkdirSync(dir, { recursive: true });
    const ext = file.type.split("/")[1];
    const name = `${user.id}-${Date.now()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    writeFileSync(join(dir, name), buf);
    const url = `/uploads/avatars/${name}`;
    await db.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
    return ok({ avatarUrl: url });
  } catch (e) {
    return fail(e);
  }
}
