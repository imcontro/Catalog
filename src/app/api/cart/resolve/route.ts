import { NextResponse } from "next/server";
import { resolveCartItems } from "@/server/cart/resolve-cart";
import type { CartResolveRequest } from "@/types/cart";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CartResolveRequest>;
    const items = Array.isArray(body.items) ? body.items : [];
    const resolvedCart = await resolveCartItems(items);

    return NextResponse.json(resolvedCart);
  } catch {
    return NextResponse.json(
      {
        message: "Не удалось обновить корзину."
      },
      {
        status: 500
      }
    );
  }
}
