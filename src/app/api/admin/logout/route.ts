import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  getExpiredAdminSessionCookieOptions,
  revokeAdminSessionToken
} from "@/server/admin/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  await revokeAdminSessionToken(token);

  const response = NextResponse.json({
    ok: true
  });

  response.cookies.set(
    ADMIN_SESSION_COOKIE_NAME,
    "",
    getExpiredAdminSessionCookieOptions()
  );

  return response;
}
