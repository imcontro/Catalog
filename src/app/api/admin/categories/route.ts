import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  validateAdminSessionToken
} from "@/server/admin/session";
import {
  AdminCategoryMutationError,
  createAdminCategory,
  getAdminCategories
} from "@/server/admin/categories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getApiAdminSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const categories = await getAdminCategories();

    return NextResponse.json({
      ok: true,
      categories
    });
  } catch {
    return NextResponse.json(
      {
        message: "Не удалось загрузить категории. Попробуйте еще раз."
      },
      {
        status: 500
      }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getApiAdminSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const result = await createAdminCategory(parseCategoryPayload(body));

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

function parseCategoryPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    return {
      name: ""
    };
  }

  const { name } = body as { name?: unknown };

  return {
    name: typeof name === "string" ? name : ""
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
      message: "Не удалось сохранить категорию. Попробуйте еще раз."
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
