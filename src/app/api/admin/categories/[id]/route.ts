import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  validateAdminSessionToken
} from "@/server/admin/session";
import {
  AdminCategoryMutationError,
  deleteAdminCategory,
  updateAdminCategory
} from "@/server/admin/categories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminCategoryRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: AdminCategoryRouteContext
) {
  const session = await getApiAdminSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateAdminCategory(id, parseCategoryPayload(body));

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return categoryMutationErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: AdminCategoryRouteContext
) {
  const session = await getApiAdminSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const result = await deleteAdminCategory(id);

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
      message: "Не удалось выполнить действие с категорией. Попробуйте еще раз."
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
