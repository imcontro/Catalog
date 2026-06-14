import { inArray } from "drizzle-orm";
import type {
  CartResolveResponse,
  RemovedCartItem,
  ResolvedCartItem
} from "@/types/cart";
import { createDatabaseConnection } from "../db/client";
import { images, productFlavors, products } from "../db/schema";

type ProductRow = typeof products.$inferSelect;
type FlavorRow = typeof productFlavors.$inferSelect;
type ImageRow = typeof images.$inferSelect;

export async function resolveCartItems(
  requestItems: unknown[]
): Promise<CartResolveResponse> {
  const normalizedItems = normalizeRequestItems(requestItems);

  if (normalizedItems.length === 0) {
    return {
      items: [],
      removedItems: []
    };
  }

  const productIds = Array.from(
    new Set(normalizedItems.map((item) => item.productId))
  );
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [productRows, flavorRows] = await Promise.all([
      db.select().from(products).where(inArray(products.id, productIds)),
      db.select().from(productFlavors).where(inArray(productFlavors.productId, productIds))
    ]);
    const imageIds = Array.from(
      new Set(
        [
          ...productRows
            .map((product) => product.mainImageId)
            .filter((imageId): imageId is string => imageId !== null),
          ...flavorRows
            .map((flavor) => flavor.imageId)
            .filter((imageId): imageId is string => imageId !== null)
        ]
      )
    );
    const imageRows =
      imageIds.length > 0
        ? await db.select().from(images).where(inArray(images.id, imageIds))
        : [];
    const productsById = new Map(productRows.map((product) => [product.id, product]));
    const flavorsById = new Map(flavorRows.map((flavor) => [flavor.id, flavor]));
    const imagesById = new Map(imageRows.map((image) => [image.id, image]));
    const items: ResolvedCartItem[] = [];
    const removedItems: RemovedCartItem[] = [];

    for (const requestItem of normalizedItems) {
      const product = productsById.get(requestItem.productId);

      if (!product || !isResolvableProduct(product)) {
        removedItems.push(toRemovedItem(requestItem, "Позиция больше не доступна в каталоге."));
        continue;
      }

      const mainImage = imagesById.get(product.mainImageId);

      if (!mainImage) {
        removedItems.push(toRemovedItem(requestItem, "Позиция больше не доступна в каталоге."));
        continue;
      }

      const flavor = requestItem.flavorId
        ? flavorsById.get(requestItem.flavorId)
        : undefined;

      if (product.hasFlavorChoice && (!flavor || flavor.productId !== product.id)) {
        removedItems.push(toRemovedItem(requestItem, "Выбранный вкус больше не доступен."));
        continue;
      }

      if (!product.hasFlavorChoice && requestItem.flavorId !== null) {
        removedItems.push(toRemovedItem(requestItem, "Позиция больше не доступна в каталоге."));
        continue;
      }

      const priceRub = flavor?.priceRub ?? product.priceRub;
      const flavorName = flavor?.name ?? null;
      const imageUrl = getCartImageUrl({
        flavor,
        imagesById,
        mainImage
      });
      const isAvailable =
        product.status === "active" && (!flavor || !flavor.isOutOfStock);
      const unavailableReason = getUnavailableReason(product, flavor);
      const priceChanged = requestItem.snapshotPriceRub !== priceRub;

      items.push({
        productId: product.id,
        flavorId: flavor?.id ?? null,
        quantity: requestItem.quantity,
        name: product.name,
        flavorName,
        priceRub,
        imageUrl,
        previousPriceRub: priceChanged ? requestItem.snapshotPriceRub : null,
        priceChanged,
        isAvailable,
        unavailableReason
      });
    }

    return {
      items,
      removedItems
    };
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

function normalizeRequestItems(items: unknown[]) {
  const normalizedItems: NormalizedRequestItem[] = [];
  const seenKeys = new Set<string>();

  for (const item of items) {
    if (!isRecord(item) || typeof item.productId !== "string" || !isUuid(item.productId)) {
      continue;
    }

    const flavorId =
      typeof item.flavorId === "string" && isUuid(item.flavorId)
        ? item.flavorId
        : null;
    const quantity =
      typeof item.quantity === "number" && Number.isInteger(item.quantity)
        ? item.quantity
        : 1;
    const snapshotPriceRub =
      typeof item.snapshotPriceRub === "number" &&
      Number.isInteger(item.snapshotPriceRub) &&
      item.snapshotPriceRub > 0
        ? item.snapshotPriceRub
        : 0;
    const boundedQuantity = Math.min(Math.max(quantity, 1), 999);
    const key = `${item.productId}:${flavorId ?? ""}`;

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    normalizedItems.push({
      productId: item.productId,
      flavorId,
      quantity: boundedQuantity,
      snapshotName: typeof item.snapshotName === "string" ? item.snapshotName : "",
      snapshotFlavorName:
        typeof item.snapshotFlavorName === "string" ? item.snapshotFlavorName : null,
      snapshotPriceRub
    });
  }

  return normalizedItems;
}

type NormalizedRequestItem = {
  productId: string;
  flavorId: string | null;
  quantity: number;
  snapshotName: string;
  snapshotFlavorName: string | null;
  snapshotPriceRub: number;
};

function isResolvableProduct(product: ProductRow): product is ProductRow & {
  categoryId: string;
  priceRub: number;
  packQuantity: number;
  mainImageId: string;
  status: "active" | "out_of_stock";
} {
  return (
    (product.status === "active" || product.status === "out_of_stock") &&
    product.deletedAt === null &&
    product.categoryId !== null &&
    product.priceRub !== null &&
    product.packQuantity !== null &&
    product.mainImageId !== null
  );
}

function getUnavailableReason(product: ProductRow, flavor: FlavorRow | undefined) {
  if (product.status === "out_of_stock") {
    return "Товар временно нет в наличии и не попадет в заказ.";
  }

  if (flavor?.isOutOfStock) {
    return "Выбранный вкус временно нет в наличии и не попадет в заказ.";
  }

  return null;
}

function getCartImageUrl({
  flavor,
  imagesById,
  mainImage
}: {
  flavor: FlavorRow | undefined;
  imagesById: Map<string, ImageRow>;
  mainImage: ImageRow;
}) {
  if (flavor?.imageId) {
    return imagesById.get(flavor.imageId)?.publicUrl ?? mainImage.publicUrl;
  }

  return mainImage.publicUrl;
}

function toRemovedItem(
  item: NormalizedRequestItem,
  reason: string
): RemovedCartItem {
  return {
    productId: item.productId,
    flavorId: item.flavorId,
    snapshotName: item.snapshotName,
    snapshotFlavorName: item.snapshotFlavorName,
    reason
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
