import { NextResponse } from "next/server";
import { getClientCatalog } from "@/server/catalog/client-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getClientCatalog();

    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json(
      {
        message: "Не удалось загрузить каталог."
      },
      {
        status: 500
      }
    );
  }
}
