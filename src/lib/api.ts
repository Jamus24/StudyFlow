import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function fail(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.message, code: err.code, details: err.details },
      { status: err.status }
    );
  }
  if (err instanceof Error && err.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Please sign in to continue.", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (err instanceof Error && err.message === "FORBIDDEN") {
    return NextResponse.json({ error: "You don't have access to that.", code: "FORBIDDEN" }, { status: 403 });
  }
  console.error("[api] unhandled", err);
  return NextResponse.json(
    { error: "Something went wrong on our end.", code: "INTERNAL" },
    { status: 500 }
  );
}

export function parseZodError(err: unknown) {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: { path: (string|number)[]; message: string }[] }).issues;
    return Object.fromEntries(issues.map((i) => [i.path[0] ?? "_", i.message]));
  }
  return null;
}

export function parsePagination(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const q = url.searchParams.get("q")?.trim() || "";
  const sort = url.searchParams.get("sort") || "createdAt";
  const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
  return { url, page, pageSize, q, sort, dir, skip: (page - 1) * pageSize };
}
