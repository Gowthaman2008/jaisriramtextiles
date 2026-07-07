import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { ADMIN_UPLOAD_COOKIE, signAdminUploadToken } from "@/lib/admin-session";

export async function POST(request: Request) {
  const expected = process.env.ADMIN_UPLOAD_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_UPLOAD_PASSWORD is not configured" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_UPLOAD_COOKIE, signAdminUploadToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
