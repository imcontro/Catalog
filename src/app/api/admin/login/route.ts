import { NextResponse } from "next/server";
import { getRequiredServerEnv } from "@/server/env";
import { verifyAdminPassword } from "@/server/admin/password";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSession,
  getAdminSessionCookieOptions
} from "@/server/admin/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_LOGIN_LENGTH = 120;
const MAX_PASSWORD_LENGTH = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const credentials = normalizeCredentials(body);

    if (!credentials) {
      return unauthorizedResponse();
    }

    const expectedLogin = getRequiredServerEnv("ADMIN_LOGIN");
    const passwordHash = getRequiredServerEnv("ADMIN_PASSWORD_HASH");
    const isValidLogin = credentials.login === expectedLogin;
    const isValidPassword = verifyAdminPassword(credentials.password, passwordHash);

    if (!isValidLogin || !isValidPassword) {
      return unauthorizedResponse();
    }

    const session = await createAdminSession();
    const response = NextResponse.json({
      ok: true
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE_NAME,
      session.token,
      getAdminSessionCookieOptions(session.expiresAt)
    );

    return response;
  } catch {
    return NextResponse.json(
      {
        message: "Не удалось выполнить вход. Попробуйте еще раз."
      },
      {
        status: 500
      }
    );
  }
}

function normalizeCredentials(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const login = typeof value.login === "string" ? value.login.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";

  if (
    login.length === 0 ||
    password.length === 0 ||
    login.length > MAX_LOGIN_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return null;
  }

  return {
    login,
    password
  };
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      message: "Неверный логин или пароль."
    },
    {
      status: 401
    }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
