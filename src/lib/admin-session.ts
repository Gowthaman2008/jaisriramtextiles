import { createHmac, timingSafeEqual } from "crypto";

/** Lightweight password gate for /admin/upload, ahead of real Supabase-backed admin auth (Phase 5). */
export const ADMIN_UPLOAD_COOKIE = "admin_upload_session";

export function signAdminUploadToken(password: string): string {
  return createHmac("sha256", password).update("admin-upload-access").digest("hex");
}

export function isValidAdminUploadSession(cookieValue: string | undefined): boolean {
  const password = process.env.ADMIN_UPLOAD_PASSWORD;
  if (!password || !cookieValue) return false;

  const expected = Buffer.from(signAdminUploadToken(password));
  const actual = Buffer.from(cookieValue);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
