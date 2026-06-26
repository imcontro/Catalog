import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  validateAdminSessionToken
} from "@/server/admin/session";
import {
  AdminProductMutationError,
  restoreHiddenAdminProduct
} from "@/server/admin/products";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminProductActionRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: AdminProductActionRouteContext
) {
  const session = await getApiAdminSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const result = await restoreHiddenAdminProduct(id);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return productActionErrorResponse(error);
  }
}

async function getApiAdminSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  return token ? validateAdminSessionToken(token) : null;
}

function productActionErrorResponse(error: unknown) {
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
      message: "Не удалось вернуть товар в каталог. Попробуйте еще раз."
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
