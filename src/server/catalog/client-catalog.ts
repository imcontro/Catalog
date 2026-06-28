import { asc } from "drizzle-orm";
import { createDatabaseConnection } from "../db/client";
import {
  categories,
  images,
  productFlavors,
  products
} from "../db/schema";
import type {
  ClientCatalogData,
  ClientCatalogFlavor,
  ClientCatalogProduct,
  ClientCatalogProductStatus
} from "@/types/client-catalog";

type ProductRow = typeof products.$inferSelect;
type FlavorRow = typeof productFlavors.$inferSelect;
type ImageRow = typeof images.$inferSelect;

export async function getClientCatalog(): Promise<ClientCatalogData> {
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [categoryRows, productRows, flavorRows, imageRows] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.sortOrder)),
      db.select().from(products).orderBy(asc(products.allDrinksSortOrder)),
      db.select().from(productFlavors).orderBy(asc(productFlavors.sortOrder)),
      db.select().from(images)
    ]);

    const imagesById = new Map(imageRows.map((image) => [image.id, image]));
    const flavorsByProductId = groupFlavorsByProductId(flavorRows);
    const clientProducts = productRows
      .map((product) => {
        const mainImage = product.mainImageId
          ? imagesById.get(product.mainImageId)
          : undefined;

        if (!mainImage || !isVisibleProduct(product)) {
          return null;
        }

        return toClientProduct({
          product,
          mainImage,
          flavors: flavorsByProductId.get(product.id) ?? [],
          imagesById
        });
      })
      .filter((product): product is ClientCatalogProduct => product !== null);

    return {
      categories: categoryRows.map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder
      })),
      products: clientProducts
    };
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

function groupFlavorsByProductId(flavorRows: FlavorRow[]) {
  const map = new Map<string, FlavorRow[]>();

  for (const flavor of flavorRows) {
    const existingFlavors = map.get(flavor.productId) ?? [];
    existingFlavors.push(flavor);
    map.set(flavor.productId, existingFlavors);
  }

  for (const flavors of map.values()) {
    flavors.sort((first, second) => first.sortOrder - second.sortOrder);
  }

  return map;
}

function isVisibleProduct(product: ProductRow): product is ProductRow & {
  categoryId: string;
  priceRub: number;
  packQuantity: number;
  mainImageId: string;
  status: ClientCatalogProductStatus;
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

function toClientProduct({
  product,
  mainImage,
  flavors,
  imagesById
}: {
  product: ProductRow & {
    categoryId: string;
    priceRub: number;
    packQuantity: number;
    mainImageId: string;
    status: ClientCatalogProductStatus;
  };
  mainImage: ImageRow;
  flavors: FlavorRow[];
  imagesById: Map<string, ImageRow>;
}): ClientCatalogProduct {
  const clientFlavors = flavors.map((flavor) =>
    toClientFlavor({
      flavor,
      basePriceRub: product.priceRub,
      mainImage,
      productStatus: product.status,
      imagesById
    })
  );
  const firstFlavor = clientFlavors[0];
  const hasAvailableFlavor =
    !product.hasFlavorChoice || clientFlavors.some((flavor) => flavor.isOrderable);
  const isOrderable = product.status === "active" && hasAvailableFlavor;
  const effectivePriceRub = firstFlavor?.priceRub ?? product.priceRub;

  return {
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    priceRub: effectivePriceRub,
    packQuantity: product.packQuantity,
    unitPriceRub: getUnitPriceRub(effectivePriceRub, product.packQuantity),
    unitPriceLabel: formatUnitPrice(effectivePriceRub, product.packQuantity),
    imageUrl: firstFlavor?.imageUrl ?? mainImage.publicUrl,
    status: product.status,
    isOrderable,
    hasFlavorChoice: product.hasFlavorChoice,
    allDrinksSortOrder: product.allDrinksSortOrder,
    categorySortOrder: product.categorySortOrder,
    flavors: clientFlavors
  };
}

function toClientFlavor({
  flavor,
  basePriceRub,
  mainImage,
  productStatus,
  imagesById
}: {
  flavor: FlavorRow;
  basePriceRub: number;
  mainImage: ImageRow;
  productStatus: ClientCatalogProductStatus;
  imagesById: Map<string, ImageRow>;
}): ClientCatalogFlavor {
  const flavorImage = flavor.imageId ? imagesById.get(flavor.imageId) : undefined;

  return {
    id: flavor.id,
    name: flavor.name,
    priceRub: flavor.priceRub ?? basePriceRub,
    imageUrl: flavorImage?.publicUrl ?? mainImage.publicUrl,
    isOutOfStock: flavor.isOutOfStock,
    isOrderable: productStatus === "active" && !flavor.isOutOfStock,
    sortOrder: flavor.sortOrder
  };
}

function getUnitPriceRub(priceRub: number, packQuantity: number) {
  return priceRub / packQuantity;
}

function formatUnitPrice(priceRub: number, packQuantity: number) {
  const formattedUnitPrice = getUnitPriceRub(priceRub, packQuantity).toLocaleString("ru-RU", {
    maximumFractionDigits: 1
  });

  return `≈ ${formattedUnitPrice} ₽/шт`;
}
