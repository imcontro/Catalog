import { sql } from "drizzle-orm";
import { createDatabaseConnection } from "./client";
import { categories } from "./schema";

export async function checkDatabaseConnection() {
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [result] = await db
      .select({ categoriesCount: sql<number>`count(*)::int` })
      .from(categories);

    return {
      ok: true,
      categoriesCount: Number(result?.categoriesCount ?? 0)
    };
  } finally {
    await queryClient.end();
  }
}
