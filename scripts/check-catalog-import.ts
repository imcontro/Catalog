import "dotenv/config";
import { createDatabaseConnection } from "../src/server/db/client";
import {
  categories,
  images,
  productFlavors,
  products
} from "../src/server/db/schema";
import {
  createSupabaseAdminClient,
  getSupabaseStorageBucketName
} from "../src/server/supabase/admin";

const expectedCounts = {
  categories: 7,
  products: 86,
  flavors: 108,
  images: 82,
  storageFiles: 82,
  draftProducts: 4
};

async function main() {
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [dbCategories, dbProducts, dbFlavors, dbImages] = await Promise.all([
      db.select().from(categories),
      db.select().from(products),
      db.select().from(productFlavors),
      db.select().from(images)
    ]);

    const importedImages = dbImages.filter((image) =>
      image.storagePath.startsWith("old-catalog/")
    );
    const activeProducts = dbProducts.filter((product) => product.deletedAt === null);
    const draftProducts = activeProducts
      .filter((product) => product.status === "draft")
      .map((product) => product.name)
      .sort((first, second) => first.localeCompare(second));

    const supabase = createSupabaseAdminClient();
    const bucketName = getSupabaseStorageBucketName();
    const { data: storageFiles, error } = await supabase.storage
      .from(bucketName)
      .list("old-catalog", { limit: 200 });

    if (error) {
      throw error;
    }

    const fileNames = storageFiles
      .filter((file) => !file.name.endsWith("/"))
      .map((file) => file.name);
    const publicUrlResults = await Promise.all(
      importedImages.map(async (image) => {
        const response = await fetch(image.publicUrl, {
          headers: {
            Range: "bytes=0-0"
          }
        });

        return {
          storagePath: image.storagePath,
          ok: response.ok || response.status === 206,
          status: response.status
        };
      })
    );
    const failedPublicUrls = publicUrlResults.filter((result) => !result.ok);
    const checks = [
      ["categories", dbCategories.length, expectedCounts.categories],
      ["products", activeProducts.length, expectedCounts.products],
      ["flavors", dbFlavors.length, expectedCounts.flavors],
      ["images", importedImages.length, expectedCounts.images],
      ["storageFiles", fileNames.length, expectedCounts.storageFiles],
      ["draftProducts", draftProducts.length, expectedCounts.draftProducts],
      ["publicUrls", publicUrlResults.length - failedPublicUrls.length, expectedCounts.images]
    ] as const;

    console.log("Проверка результата импорта старого каталога:");
    console.log(`Категорий: ${dbCategories.length}.`);
    console.log(`Товаров: ${activeProducts.length}.`);
    console.log(`Вкусов: ${dbFlavors.length}.`);
    console.log(`Images old-catalog: ${importedImages.length}.`);
    console.log(`Файлов в Storage old-catalog: ${fileNames.length}.`);
    console.log(
      `Публичных ссылок открывается: ${
        publicUrlResults.length - failedPublicUrls.length
      }/${publicUrlResults.length}.`
    );
    console.log("Черновики:");
    for (const productName of draftProducts) {
      console.log(`- ${productName}`);
    }

    const failedChecks = checks.filter(([, actual, expected]) => actual !== expected);

    if (failedChecks.length > 0 || failedPublicUrls.length > 0) {
      if (failedChecks.length > 0) {
        console.error("Не совпали ожидаемые значения:");
        for (const [name, actual, expected] of failedChecks) {
          console.error(`- ${name}: ожидалось ${expected}, получено ${actual}`);
        }
      }

      if (failedPublicUrls.length > 0) {
        console.error("Не открылись публичные ссылки:");
        for (const failedPublicUrl of failedPublicUrls) {
          console.error(
            `- ${failedPublicUrl.storagePath}: HTTP ${failedPublicUrl.status}`
          );
        }
      }

      process.exitCode = 1;
    }
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error("Не удалось проверить результат импорта старого каталога.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
