import { createHmac, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRequiredServerEnv } from "../env";
import { createDatabaseConnection } from "../db/client";
import { adminSessions } from "../db/schema";

export const ADMIN_SESSION_COOKIE_NAME = "napitki_admin_session";

const SESSION_LIFETIME_DAYS = 7;
const SESSION_TOKEN_BYTES = 32;

export async function createAdminSession() {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
  const sessionTokenHash = hashSessionToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000
  );
  const { db, queryClient } = createDatabaseConnection();

  try {
    await db.insert(adminSessions).values({
      sessionTokenHash,
      expiresAt
    });
  } finally {
    await queryClient.end({ timeout: 5 });
  }

  return {
    token,
    expiresAt
  };
}

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return validateAdminSessionToken(token);
}

export async function requireAdminSession() {
  const session = await getCurrentAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export async function validateAdminSessionToken(token: string) {
  if (!isValidSessionToken(token)) {
    return null;
  }

  const sessionTokenHash = hashSessionToken(token);
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [session] = await db
      .select({
        id: adminSessions.id,
        expiresAt: adminSessions.expiresAt
      })
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.sessionTokenHash, sessionTokenHash),
          gt(adminSessions.expiresAt, new Date()),
          isNull(adminSessions.revokedAt)
        )
      )
      .limit(1);

    return session ?? null;
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export async function revokeAdminSessionToken(token: string | undefined) {
  if (!token || !isValidSessionToken(token)) {
    return;
  }

  const sessionTokenHash = hashSessionToken(token);
  const { db, queryClient } = createDatabaseConnection();

  try {
    await db
      .update(adminSessions)
      .set({
        revokedAt: new Date()
      })
      .where(
        and(
          eq(adminSessions.sessionTokenHash, sessionTokenHash),
          isNull(adminSessions.revokedAt)
        )
      );
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export function getAdminSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt
  };
}

export function getExpiredAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0
  };
}

function hashSessionToken(token: string) {
  return createHmac("sha256", getRequiredServerEnv("SESSION_SECRET"))
    .update(token)
    .digest("hex");
}

function isValidSessionToken(token: string) {
  return /^[A-Za-z0-9_-]{32,128}$/.test(token);
}
