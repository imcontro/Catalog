import { and, asc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { createDatabaseConnection } from "../db/client";
import { categories, products } from "../db/schema";

export type AdminCategoryItem = {
  id: string;
  name: string;
  sortOrder: number;
  productCount: number;
};

export class AdminCategoryMutationError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

const MAX_CATEGORY_NAME_LENGTH = 80;

export async function getAdminCategories(): Promise<AdminCategoryItem[]> {
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
    const countRows = await db
      .select({
        categoryId: products.categoryId,
        productCount: sql<number>`count(*)::int`
      })
      .from(products)
      .where(and(isNull(products.deletedAt), isNotNull(products.categoryId)))
      .groupBy(products.categoryId);
    const productCounts = new Map(
      countRows
        .filter((row): row is { categoryId: string; productCount: number } => row.categoryId !== null)
        .map((row) => [row.categoryId, Number(row.productCount)])
    );

    return rows.map((category) => ({
      ...category,
      productCount: productCounts.get(category.id) ?? 0
    }));
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export async function createAdminCategory(input: { name: string }) {
  const name = normalizeCategoryName(input.name);
  const { db, queryClient } = createDatabaseConnection();

  try {
    return await db.transaction(async (tx) => {
      await validateUniqueCategoryName(tx, name);

      const [orderRow] = await tx
        .select({
          value: sql<number>`coalesce(max(${categories.sortOrder}), -1)`
        })
        .from(categories);
      const sortOrder = Number(orderRow?.value ?? -1) + 1;
      const [createdCategory] = await tx
        .insert(categories)
        .values({
          name,
          sortOrder
        })
        .returning({
          id: categories.id
        });

      if (!createdCategory) {
        throw new AdminCategoryMutationError("Не удалось добавить категорию.", 500);
      }

      return {
        id: createdCategory.id
      };
    });
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export async function updateAdminCategory(id: string, input: { name: string }) {
  const name = normalizeCategoryName(input.name);
  const { db, queryClient } = createDatabaseConnection();

  try {
    return await db.transaction(async (tx) => {
      const [currentCategory] = await tx
        .select({
          id: categories.id
        })
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (!currentCategory) {
        throw new AdminCategoryMutationError("Категория не найдена.", 404);
      }

      await validateUniqueCategoryName(tx, name, id);

      await tx
        .update(categories)
        .set({
          name,
          updatedAt: new Date()
        })
        .where(eq(categories.id, id));

      return {
        id
      };
    });
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

export async function deleteAdminCategory(id: string) {
  const { db, queryClient } = createDatabaseConnection();

  try {
    return await db.transaction(async (tx) => {
      const [currentCategory] = await tx
        .select({
          id: categories.id
        })
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (!currentCategory) {
        throw new AdminCategoryMutationError("Категория не найдена.", 404);
      }

      const [productInCategory] = await tx
        .select({
          id: products.id
        })
        .from(products)
        .where(and(eq(products.categoryId, id), isNull(products.deletedAt)))
        .limit(1);

      if (productInCategory) {
        throw new AdminCategoryMutationError(
          "Категорию нельзя удалить, пока в ней есть товары. Сначала перенесите товары в другую категорию или удалите эти товары.",
          409
        );
      }

      await tx
        .update(products)
        .set({
          categoryId: null,
          updatedAt: new Date()
        })
        .where(and(eq(products.categoryId, id), isNotNull(products.deletedAt)));

      await tx.delete(categories).where(eq(categories.id, id));

      return {
        id
      };
    });
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

function normalizeCategoryName(value: string) {
  const name = value.trim().replace(/\s+/g, " ").slice(0, MAX_CATEGORY_NAME_LENGTH);

  if (!name) {
    throw new AdminCategoryMutationError("Введите название категории.");
  }

  return name;
}

async function validateUniqueCategoryName(
  db: Parameters<
    Parameters<ReturnType<typeof createDatabaseConnection>["db"]["transaction"]>[0]
  >[0],
  name: string,
  excludedCategoryId?: string
) {
  const filters = [
    sql`lower(${categories.name}) = lower(${name})`,
    excludedCategoryId ? ne(categories.id, excludedCategoryId) : undefined
  ].filter((filter): filter is NonNullable<typeof filter> => filter !== undefined);
  const [existingCategory] = await db
    .select({
      id: categories.id
    })
    .from(categories)
    .where(and(...filters))
    .limit(1);

  if (existingCategory) {
    throw new AdminCategoryMutationError("Категория с таким названием уже есть.");
  }
}
