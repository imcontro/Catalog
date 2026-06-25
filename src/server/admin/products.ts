import { and, asc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { createDatabaseConnection } from "../db/client";
import { categories, images, products } from "../db/schema";

export type AdminProductListKind = "products" | "drafts" | "hidden";

export type AdminProductCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type AdminProductListItem = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  priceRub: number | null;
  packQuantity: number | null;
  imageUrl: string | null;
  status: "active" | "out_of_stock" | "hidden" | "draft";
  hasFlavorChoice: boolean;
  allDrinksSortOrder: number;
  categorySortOrder: number;
};

const MAX_SEARCH_LENGTH = 120;

export async function getAdminProductsList({
  kind,
  categoryId,
  search
}: {
  kind: AdminProductListKind;
  categoryId?: string;
  search?: string;
}): Promise<AdminProductListItem[]> {
  const normalizedSearch = normalizeSearch(search);
  const statusFilter = getStatusFilter(kind);
  const filters = [
    isNull(products.deletedAt),
    statusFilter,
    categoryId ? eq(products.categoryId, categoryId) : undefined,
    normalizedSearch ? ilike(products.name, `%${normalizedSearch}%`) : undefined
  ].filter((filter): filter is NonNullable<typeof filter> => filter !== undefined);
  const orderByColumns = categoryId
    ? [asc(products.categorySortOrder), asc(products.name)]
    : [asc(products.allDrinksSortOrder), asc(products.name)];
  const { db, queryClient } = createDatabaseConnection();

  try {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        categoryId: products.categoryId,
        categoryName: categories.name,
        priceRub: products.priceRub,
        packQuantity: products.packQuantity,
        imageUrl: images.publicUrl,
        status: products.status,
        hasFlavorChoice: products.hasFlavorChoice,
        allDrinksSortOrder: products.allDrinksSortOrder,
        categorySortOrder: products.categorySortOrder
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(images, eq(products.mainImageId, images.id))
      .where(and(...filters))
      .orderBy(...orderByColumns);

    return rows;
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export async function getAdminProductCategories(): Promise<AdminProductCategory[]> {
  const { db, queryClient } = createDatabaseConnection();

  try {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        sortOrder: categories.sortOrder
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    return rows;
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export function normalizeAdminProductSearch(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return normalizeSearch(rawValue);
}

export function normalizeAdminProductCategory(
  value: string | string[] | undefined,
  availableCategories: AdminProductCategory[]
) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return "";
  }

  return availableCategories.some((category) => category.id === rawValue) ? rawValue : "";
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
