import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AdminImageUploadError, uploadAdminImage } from "@/server/admin/images";
import {
  ADMIN_SESSION_COOKIE_NAME,
  validateAdminSessionToken
} from "@/server/admin/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getApiAdminSession(request);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new AdminImageUploadError("Выберите файл фото.");
    }

    const result = await uploadAdminImage(file);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return imageUploadErrorResponse(error);
  }
}

async function getApiAdminSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  return token ? validateAdminSessionToken(token) : null;
}

function imageUploadErrorResponse(error: unknown) {
  if (error instanceof AdminImageUploadError) {
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
      message: "Не удалось загрузить фото. Попробуйте еще раз."
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
