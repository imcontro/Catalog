import { and, asc, eq, ilike, inArray, isNull, ne, sql } from "drizzle-orm";
import { createDatabaseConnection } from "../db/client";
import { categories, images, products } from "../db/schema";

export type AdminProductListKind = "products" | "drafts" | "hidden";
export type AdminProductStatus = "active" | "out_of_stock" | "hidden" | "draft";

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
  status: AdminProductStatus;
  hasFlavorChoice: boolean;
  allDrinksSortOrder: number;
  categorySortOrder: number;
};

export type AdminProductEditItem = AdminProductListItem & {
  mainImageId: string | null;
};

export type AdminProductMutationInput = {
  name: string;
  categoryId: string | null;
  priceRub: number | null;
  packQuantity: number | null;
  mainImageId: string | null;
  status: AdminProductStatus;
};

export class AdminProductMutationError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

const MAX_SEARCH_LENGTH = 120;
const ADMIN_PRODUCT_STATUSES = ["active", "out_of_stock", "hidden", "draft"] as const;

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

export async function getAdminProductForEdit(
  id: string
): Promise<AdminProductEditItem | null> {
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [row] = await db
      .select({
        id: products.id,
        name: products.name,
        categoryId: products.categoryId,
        categoryName: categories.name,
        priceRub: products.priceRub,
        packQuantity: products.packQuantity,
        mainImageId: products.mainImageId,
        imageUrl: images.publicUrl,
        status: products.status,
        hasFlavorChoice: products.hasFlavorChoice,
        allDrinksSortOrder: products.allDrinksSortOrder,
        categorySortOrder: products.categorySortOrder
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(images, eq(products.mainImageId, images.id))
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    return row ?? null;
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

export async function createAdminProduct(input: AdminProductMutationInput) {
  const normalizedInput = normalizeMutationInput(input);
  const { db, queryClient } = createDatabaseConnection();

  try {
    return await db.transaction(async (tx) => {
      await validateCategory(tx, normalizedInput.categoryId);
      await validateMainImage(tx, normalizedInput.mainImageId);
      validatePublicationData(normalizedInput, normalizedInput.mainImageId);

      const allDrinksSortOrder = await getNextAllDrinksSortOrder(tx);
      const categorySortOrder = normalizedInput.categoryId
        ? await getNextCategorySortOrder(tx, normalizedInput.categoryId)
        : 0;
      const [createdProduct] = await tx
        .insert(products)
        .values({
          name: normalizedInput.name,
          categoryId: normalizedInput.categoryId,
          priceRub: normalizedInput.priceRub,
          packQuantity: normalizedInput.packQuantity,
          mainImageId: normalizedInput.mainImageId,
          status: normalizedInput.status,
          hasFlavorChoice: false,
          allDrinksSortOrder,
          categorySortOrder
        })
        .returning({
          id: products.id,
          status: products.status
        });

      if (!createdProduct) {
        throw new AdminProductMutationError("Не удалось сохранить товар.", 500);
      }

      return {
        id: createdProduct.id,
        redirectTo: `/admin/products/${createdProduct.id}/edit`
      };
    });
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export async function updateAdminProduct(id: string, input: AdminProductMutationInput) {
  const normalizedInput = normalizeMutationInput(input);
  const { db, queryClient } = createDatabaseConnection();

  try {
    return await db.transaction(async (tx) => {
      const [currentProduct] = await tx
        .select({
          id: products.id,
          categoryId: products.categoryId,
          mainImageId: products.mainImageId
        })
        .from(products)
        .where(and(eq(products.id, id), isNull(products.deletedAt)))
        .limit(1);

      if (!currentProduct) {
        throw new AdminProductMutationError("Товар не найден или удален.", 404);
      }

      await validateCategory(tx, normalizedInput.categoryId);
      await validateMainImage(tx, normalizedInput.mainImageId);
      validatePublicationData(normalizedInput, normalizedInput.mainImageId);

      const categoryChanged = currentProduct.categoryId !== normalizedInput.categoryId;
      const nextCategorySortOrder = categoryChanged
        ? normalizedInput.categoryId
          ? await getNextCategorySortOrder(tx, normalizedInput.categoryId)
          : 0
        : undefined;

      await tx
        .update(products)
        .set({
          name: normalizedInput.name,
          categoryId: normalizedInput.categoryId,
          priceRub: normalizedInput.priceRub,
          packQuantity: normalizedInput.packQuantity,
          mainImageId: normalizedInput.mainImageId,
          status: normalizedInput.status,
          categorySortOrder: nextCategorySortOrder,
          updatedAt: new Date()
        })
        .where(eq(products.id, id));

      if (categoryChanged && currentProduct.categoryId) {
        const oldCategoryProducts = await tx
          .select({
            id: products.id
          })
          .from(products)
          .where(
            and(
              isNull(products.deletedAt),
              eq(products.categoryId, currentProduct.categoryId),
              ne(products.id, id)
            )
          )
          .orderBy(asc(products.categorySortOrder), asc(products.name));

        await Promise.all(
          oldCategoryProducts.map((product, index) =>
            tx
              .update(products)
              .set({
                categorySortOrder: index,
                updatedAt: new Date()
              })
              .where(eq(products.id, product.id))
          )
        );
      }

      return {
        id,
        redirectTo: getAdminProductsHrefByStatus(normalizedInput.status)
      };
    });
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export async function hideAdminProduct(id: string) {
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [updatedProduct] = await db
      .update(products)
      .set({
        status: "hidden",
        updatedAt: new Date()
      })
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .returning({
        id: products.id
      });

    if (!updatedProduct) {
      throw new AdminProductMutationError("Товар не найден или удален.", 404);
    }

    return {
      id,
      redirectTo: "/admin/hidden"
    };
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export async function restoreHiddenAdminProduct(id: string) {
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [currentProduct] = await db
      .select({
        id: products.id,
        name: products.name,
        categoryId: products.categoryId,
        priceRub: products.priceRub,
        packQuantity: products.packQuantity,
        mainImageId: products.mainImageId,
        status: products.status
      })
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    if (!currentProduct) {
      throw new AdminProductMutationError("Товар не найден или удален.", 404);
    }

    if (currentProduct.status !== "hidden") {
      throw new AdminProductMutationError("Товар уже не находится в скрытых.", 409);
    }

    validatePublicationData(
      {
        name: currentProduct.name,
        categoryId: currentProduct.categoryId,
        priceRub: currentProduct.priceRub,
        packQuantity: currentProduct.packQuantity,
        mainImageId: currentProduct.mainImageId,
        status: "active"
      },
      currentProduct.mainImageId
    );

    await db
      .update(products)
      .set({
        status: "active",
        updatedAt: new Date()
      })
      .where(eq(products.id, id));

    return {
      id,
      redirectTo: "/admin/products"
    };
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export async function deleteAdminProduct(id: string) {
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [updatedProduct] = await db
      .update(products)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .returning({
        id: products.id
      });

    if (!updatedProduct) {
      throw new AdminProductMutationError("Товар не найден или уже удален.", 404);
    }

    return {
      id,
      redirectTo: "/admin/products"
    };
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

export function isAdminProductStatus(value: unknown): value is AdminProductStatus {
  return ADMIN_PRODUCT_STATUSES.some((status) => status === value);
}

export function getAdminProductsHrefByStatus(status: AdminProductStatus) {
  if (status === "draft") {
    return "/admin/drafts";
  }

  if (status === "hidden") {
    return "/admin/hidden";
  }

  return "/admin/products";
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

function normalizeMutationInput(input: AdminProductMutationInput) {
  const name = input.name.trim();

  if (!name) {
    throw new AdminProductMutationError("Введите название товара.");
  }

  return {
    name,
    categoryId: input.categoryId,
    priceRub: input.priceRub,
    packQuantity: input.packQuantity,
    mainImageId: input.mainImageId,
    status: input.status
  };
}

async function validateCategory(
  db: Parameters<Parameters<ReturnType<typeof createDatabaseConnection>["db"]["transaction"]>[0]>[0],
  categoryId: string | null
) {
  if (!categoryId) {
    return;
  }

  const [category] = await db
    .select({
      id: categories.id
    })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  if (!category) {
    throw new AdminProductMutationError("Выбранная категория не найдена.");
  }
}

async function validateMainImage(
  db: Parameters<Parameters<ReturnType<typeof createDatabaseConnection>["db"]["transaction"]>[0]>[0],
  mainImageId: string | null
) {
  if (!mainImageId) {
    return;
  }

  const [image] = await db
    .select({
      id: images.id
    })
    .from(images)
    .where(eq(images.id, mainImageId))
    .limit(1);

  if (!image) {
    throw new AdminProductMutationError("Выбранное фото не найдено.");
  }
}

function validatePublicationData(
  input: AdminProductMutationInput,
  mainImageId: string | null
) {
  if (input.status !== "active" && input.status !== "out_of_stock") {
    return;
  }

  if (!input.categoryId) {
    throw new AdminProductMutationError(
      "Чтобы опубликовать товар, выберите категорию."
    );
  }

  if (input.priceRub === null) {
    throw new AdminProductMutationError("Чтобы опубликовать товар, укажите цену.");
  }

  if (input.packQuantity === null) {
    throw new AdminProductMutationError(
      "Чтобы опубликовать товар, укажите количество штук в одной уп."
    );
  }

  if (!mainImageId) {
    throw new AdminProductMutationError(
      "Чтобы опубликовать товар, нужно добавить основное фото."
    );
  }
}

async function getNextAllDrinksSortOrder(
  db: Parameters<Parameters<ReturnType<typeof createDatabaseConnection>["db"]["transaction"]>[0]>[0]
) {
  const [row] = await db
    .select({
      value: sql<number>`coalesce(max(${products.allDrinksSortOrder}), -1)`
    })
    .from(products)
    .where(isNull(products.deletedAt));

  return Number(row?.value ?? -1) + 1;
}

async function getNextCategorySortOrder(
  db: Parameters<Parameters<ReturnType<typeof createDatabaseConnection>["db"]["transaction"]>[0]>[0],
  categoryId: string
) {
  const [row] = await db
    .select({
      value: sql<number>`coalesce(max(${products.categorySortOrder}), -1)`
    })
    .from(products)
    .where(and(isNull(products.deletedAt), eq(products.categoryId, categoryId)));

  return Number(row?.value ?? -1) + 1;
}
