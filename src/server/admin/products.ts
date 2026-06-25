import { and, asc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { createDatabaseConnection } from "../db/client";
import { categories, images, products } from "../db/schema";

export type AdminProductListKind = "products" | "drafts" | "hidden";

export type AdminProductListItem = {
  id: string;
  name: string;
  categoryName: string | null;
  priceRub: number | null;
  packQuantity: number | null;
  imageUrl: string | null;
  status: "active" | "out_of_stock" | "hidden" | "draft";
  hasFlavorChoice: boolean;
  allDrinksSortOrder: number;
};

const MAX_SEARCH_LENGTH = 120;

export async function getAdminProductsList({
  kind,
  search
}: {
  kind: AdminProductListKind;
  search?: string;
}): Promise<AdminProductListItem[]> {
  const normalizedSearch = normalizeSearch(search);
  const statusFilter = getStatusFilter(kind);
  const filters = [
    isNull(products.deletedAt),
    statusFilter,
    normalizedSearch ? ilike(products.name, `%${normalizedSearch}%`) : undefined
  ].filter((filter): filter is NonNullable<typeof filter> => filter !== undefined);
  const { db, queryClient } = createDatabaseConnection();

  try {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        categoryName: categories.name,
        priceRub: products.priceRub,
        packQuantity: products.packQuantity,
        imageUrl: images.publicUrl,
        status: products.status,
        hasFlavorChoice: products.hasFlavorChoice,
        allDrinksSortOrder: products.allDrinksSortOrder
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(images, eq(products.mainImageId, images.id))
      .where(and(...filters))
      .orderBy(asc(products.allDrinksSortOrder), asc(products.name));

    return rows;
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export function normalizeAdminProductSearch(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return normalizeSearch(rawValue);
}

function getStatusFilter(kind: AdminProductListKind) {
  if (kind === "drafts") {
    return eq(products.status, "draft");
  }

  if (kind === "hidden") {
    return eq(products.status, "hidden");
  }

  return inArray(products.status, ["active", "out_of_stock"]);
}

function normalizeSearch(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value.trim().slice(0, MAX_SEARCH_LENGTH);
}
