import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  validateAdminSessionToken
} from "@/server/admin/session";
import {
  AdminCategoryMutationError,
  reorderAdminCategories
} from "@/server/admin/categories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getApiAdminSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const result = await reorderAdminCategories(parseReorderPayload(body));

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return categoryMutationErrorResponse(error);
  }
}

async function getApiAdminSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  return token ? validateAdminSessionToken(token) : null;
}

function parseReorderPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    return {
      ids: []
    };
  }

  const { ids } = body as { ids?: unknown };

  return {
    ids: Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []
  };
}

function categoryMutationErrorResponse(error: unknown) {
  if (error instanceof AdminCategoryMutationError) {
    return NextResponse.json(
      {
        message: error.message
      },
      {
        status: error.status
      }
    );
  }

  return NextResponse.json(
    {
      message: "Не удалось сохранить порядок категорий. Попробуйте еще раз."
    },
    {
      status: 500
    }
  );
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      message: "Войдите в админку заново."
    },
    {
      status: 401
    }
  );
}
