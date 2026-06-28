import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  validateAdminSessionToken
} from "@/server/admin/session";
import {
  AdminProductMutationError,
  reorderAdminProductsInAllDrinks
} from "@/server/admin/products";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getApiAdminSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const result = await reorderAdminProductsInAllDrinks(parseReorderPayload(body));

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return productMutationErrorResponse(error);
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

function productMutationErrorResponse(error: unknown) {
  if (error instanceof AdminProductMutationError) {
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
      message: "Не удалось сохранить порядок товаров. Попробуйте еще раз."
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
