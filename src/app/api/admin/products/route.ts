import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  validateAdminSessionToken
} from "@/server/admin/session";
import { AdminProductMutationError, createAdminProduct } from "@/server/admin/products";
import { parseAdminProductPayload } from "@/server/admin/product-payload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getApiAdminSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const result = await createAdminProduct(parseAdminProductPayload(body));

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
      message: "Не удалось сохранить товар. Попробуйте еще раз."
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
