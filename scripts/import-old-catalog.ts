import "dotenv/config";
import { eq } from "drizzle-orm";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
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

const draftCatalogPath = path.join(
  process.cwd(),
  "data",
  "import",
  "old-catalog-products.draft.json"
);
const photosDirectoryPath = path.join(
  process.cwd(),
  "data",
  "source-old-catalog",
  "photos"
);
const reportPath = path.join(
  process.cwd(),
  "data",
  "import",
  "old-catalog-import-preparation-report.md"
);

const oldToTargetCategoryName = {
  "Вода/Минералка": "вода",
  "Газированные": "газировки",
  "Лимонады": "лимонады",
  "Натуральные": "натуральные напитки",
  "Чай": "чай",
  "Энергетики": "энергетики",
  "Напитки разные": "разные напитки"
} as const;

const productStatuses = ["active", "out_of_stock", "hidden", "draft"] as const;
const maxImageSizeBytes = 5 * 1024 * 1024;
const imageMimeTypesByExtension = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);

type ProductStatus = (typeof productStatuses)[number];
type DraftCatalog = {
  summary: DraftSummary;
  categories: DraftCategory[];
  products: DraftProduct[];
};
type DraftSummary = {
  categories: number;
  products: number;
  productsWithFlavors: number;
  flavorOptions: number;
  photoFiles: number;
  missingMainPhotoIds: number;
  flavorPhotoFallbacks: number;
  unusedPhotoFiles: number;
  draftProducts: number;
};
type DraftCategory = {
  id: string;
  name: string;
  sortOrder: number;
};
type DraftProduct = {
  source: string;
  oldCategoryId: string;
  category: string;
  name: string;
  sourceDataName: string;
  priceRub: number | null;
  packQuantity: number | null;
  packDisplay: string;
  mainPhotoId: string | null;
  mainPhotoFile: string | null;
  status: ProductStatus;
  hasFlavorChoice: boolean;
  flavors: DraftFlavor[];
  allDrinksSortOrder: number;
  categorySortOrder: number;
  issues: string[];
};
type DraftFlavor = {
  name: string;
  priceRub: number | null;
  photoId: string | null;
  photoFile: string | null;
  usesMainPhotoFallback: boolean;
  isOutOfStock: boolean;
  sortOrder: number;
  issues: string[];
};
type LocalPhotoFile = {
  fileName: string;
  sizeBytes: number;
  mimeType: string | null;
  isSupportedImage: boolean;
};
type PhotoImportItem = {
  fileName: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};
type ProductImportItem = {
  product: DraftProduct;
  targetCategoryName: string;
  mainImageStoragePath: string | null;
  flavors: FlavorImportItem[];
};
type FlavorImportItem = {
  flavor: DraftFlavor;
  imageStoragePath: string | null;
};
type ImportPlan = {
  catalog: DraftCatalog;
  photoFiles: LocalPhotoFile[];
  photosByName: Map<string, LocalPhotoFile>;
  photoItems: PhotoImportItem[];
  productItems: ProductImportItem[];
  unusedPhotoFiles: LocalPhotoFile[];
  missingMainPhotoProducts: DraftProduct[];
  readyProductsCount: number;
  draftProductsCount: number;
  flavorsCount: number;
  flavorFallbacksCount: number;
};
type ValidationResult = {
  plan: ImportPlan;
  errors: string[];
  warnings: string[];
};
type DatabaseComparison = {
  errors: string[];
  categories: {
    existing: number;
    missing: string[];
  };
  images: {
    create: number;
    update: number;
  };
  products: {
    create: number;
    update: number;
    draft: number;
  };
  flavors: {
    create: number;
    update: number;
  };
};

type DbCategory = typeof categories.$inferSelect;
type DbImage = typeof images.$inferSelect;
type DbProduct = typeof products.$inferSelect;
type DbFlavor = typeof productFlavors.$inferSelect;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string, context: string) {
  const value = record[key];

  if (typeof value !== "string") {
    throw new Error(`${context}: поле ${key} должно быть строкой.`);
  }

  return value;
}

function readNullableString(
  record: Record<string, unknown>,
  key: string,
  context: string
) {
  const value = record[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${context}: поле ${key} должно быть строкой или null.`);
  }

  return value;
}

function readNumber(record: Record<string, unknown>, key: string, context: string) {
  const value = record[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}: поле ${key} должно быть числом.`);
  }

  return value;
}

function readNullableNumber(
  record: Record<string, unknown>,
  key: string,
  context: string
) {
  const value = record[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}: поле ${key} должно быть числом или null.`);
  }

  return value;
}

function readBoolean(record: Record<string, unknown>, key: string, context: string) {
  const value = record[key];

  if (typeof value !== "boolean") {
    throw new Error(`${context}: поле ${key} должно быть true или false.`);
  }

  return value;
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
  context: string
) {
  const value = record[key];

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${context}: поле ${key} должно быть массивом строк.`);
  }

  return value as string[];
}

function readArray(record: Record<string, unknown>, key: string, context: string) {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new Error(`${context}: поле ${key} должно быть массивом.`);
  }

  return value;
}

function parseProductStatus(value: string, context: string): ProductStatus {
  if (productStatuses.some((status) => status === value)) {
    return value as ProductStatus;
  }

  throw new Error(`${context}: неизвестный статус товара ${value}.`);
}

function parseDraftCatalog(raw: unknown): DraftCatalog {
  if (!isRecord(raw)) {
    throw new Error("Корень draft JSON должен быть объектом.");
  }

  if (!isRecord(raw.summary)) {
    throw new Error("Поле summary должно быть объектом.");
  }

  const summaryContext = "summary";
  const summary: DraftSummary = {
    categories: readNumber(raw.summary, "categories", summaryContext),
    products: readNumber(raw.summary, "products", summaryContext),
    productsWithFlavors: readNumber(
      raw.summary,
      "productsWithFlavors",
      summaryContext
    ),
    flavorOptions: readNumber(raw.summary, "flavorOptions", summaryContext),
    photoFiles: readNumber(raw.summary, "photoFiles", summaryContext),
    missingMainPhotoIds: readNumber(
      raw.summary,
      "missingMainPhotoIds",
      summaryContext
    ),
    flavorPhotoFallbacks: readNumber(
      raw.summary,
      "flavorPhotoFallbacks",
      summaryContext
    ),
    unusedPhotoFiles: readNumber(raw.summary, "unusedPhotoFiles", summaryContext),
    draftProducts: readNumber(raw.summary, "draftProducts", summaryContext)
  };

  const categoriesValue = readArray(raw, "categories", "catalog");
  const productsValue = readArray(raw, "products", "catalog");

  const parsedCategories = categoriesValue.map((category, index) => {
    if (!isRecord(category)) {
      throw new Error(`categories[${index}] должен быть объектом.`);
    }

    return {
      id: readString(category, "id", `categories[${index}]`),
      name: readString(category, "name", `categories[${index}]`),
      sortOrder: readNumber(category, "sortOrder", `categories[${index}]`)
    };
  });

  const parsedProducts = productsValue.map((product, productIndex) => {
    if (!isRecord(product)) {
      throw new Error(`products[${productIndex}] должен быть объектом.`);
    }

    const productContext = `products[${productIndex}]`;
    const flavorsValue = readArray(product, "flavors", productContext);
    const flavors = flavorsValue.map((flavor, flavorIndex) => {
      if (!isRecord(flavor)) {
        throw new Error(`${productContext}.flavors[${flavorIndex}] должен быть объектом.`);
      }

      const flavorContext = `${productContext}.flavors[${flavorIndex}]`;

      return {
        name: readString(flavor, "name", flavorContext),
        priceRub: readNullableNumber(flavor, "priceRub", flavorContext),
        photoId: readNullableString(flavor, "photoId", flavorContext),
        photoFile: readNullableString(flavor, "photoFile", flavorContext),
        usesMainPhotoFallback: readBoolean(
          flavor,
          "usesMainPhotoFallback",
          flavorContext
        ),
        isOutOfStock: readBoolean(flavor, "isOutOfStock", flavorContext),
        sortOrder: readNumber(flavor, "sortOrder", flavorContext),
        issues: readStringArray(flavor, "issues", flavorContext)
      };
    });

    const status = parseProductStatus(
      readString(product, "status", productContext),
      productContext
    );

    return {
      source: readString(product, "source", productContext),
      oldCategoryId: readString(product, "oldCategoryId", productContext),
      category: readString(product, "category", productContext),
      name: readString(product, "name", productContext),
      sourceDataName: readString(product, "sourceDataName", productContext),
      priceRub: readNullableNumber(product, "priceRub", productContext),
      packQuantity: readNullableNumber(product, "packQuantity", productContext),
      packDisplay: readString(product, "packDisplay", productContext),
      mainPhotoId: readNullableString(product, "mainPhotoId", productContext),
      mainPhotoFile: readNullableString(product, "mainPhotoFile", productContext),
      status,
      hasFlavorChoice: readBoolean(product, "hasFlavorChoice", productContext),
      flavors,
      allDrinksSortOrder: readNumber(
        product,
        "allDrinksSortOrder",
        productContext
      ),
      categorySortOrder: readNumber(product, "categorySortOrder", productContext),
      issues: readStringArray(product, "issues", productContext)
    };
  });

  return {
    summary,
    categories: parsedCategories,
    products: parsedProducts
  };
}

async function loadDraftCatalog() {
  const rawJson = await readFile(draftCatalogPath, "utf8");
  return parseDraftCatalog(JSON.parse(rawJson) as unknown);
}

async function loadPhotoFiles() {
  const directoryEntries = await readdir(photosDirectoryPath, {
    withFileTypes: true
  });
  const files: LocalPhotoFile[] = [];

  for (const entry of directoryEntries) {
    if (!entry.isFile()) {
      continue;
    }

    const fileName = entry.name;
    const filePath = path.join(photosDirectoryPath, fileName);
    const fileStat = await stat(filePath);
    const extension = path.extname(fileName).toLowerCase();
    const mimeType = imageMimeTypesByExtension.get(extension) ?? null;

    files.push({
      fileName,
      sizeBytes: fileStat.size,
      mimeType,
      isSupportedImage: mimeType !== null
    });
  }

  return files.sort((first, second) => first.fileName.localeCompare(second.fileName));
}

function createStoragePath(fileName: string) {
  return `old-catalog/${fileName}`;
}

function assertSafePhotoFileName(fileName: string, context: string, errors: string[]) {
  if (path.basename(fileName) !== fileName || fileName.includes("/") || fileName.includes("\\")) {
    errors.push(`${context}: имя файла фото ${fileName} содержит путь.`);
  }
}

function getTargetCategoryName(oldCategoryName: string) {
  return oldToTargetCategoryName[
    oldCategoryName as keyof typeof oldToTargetCategoryName
  ];
}

function countProductsWithFlavors(productsList: DraftProduct[]) {
  return productsList.filter((product) => product.hasFlavorChoice).length;
}

function countFlavorOptions(productsList: DraftProduct[]) {
  return productsList.reduce((count, product) => count + product.flavors.length, 0);
}

function countFlavorFallbacks(productsList: DraftProduct[]) {
  return productsList.reduce(
    (count, product) =>
      count +
      product.flavors.filter((flavor) => flavor.usesMainPhotoFallback).length,
    0
  );
}

function countDraftProducts(productsList: DraftProduct[]) {
  return productsList.filter((product) => product.status === "draft").length;
}

function isProductReadyForClient(product: DraftProduct) {
  return (
    product.status !== "draft" &&
    product.status !== "hidden" &&
    product.priceRub !== null &&
    product.packQuantity !== null &&
    product.mainPhotoFile !== null &&
    getTargetCategoryName(product.category) !== undefined
  );
}

function validateAndCreatePlan(
  catalog: DraftCatalog,
  photoFiles: LocalPhotoFile[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const photosByName = new Map(photoFiles.map((file) => [file.fileName, file]));
  const sourceCategoryNames = new Set(catalog.categories.map((category) => category.name));
  const usedPhotoFileNames = new Set<string>();
  const photoItemsByFileName = new Map<string, PhotoImportItem>();
  const productItems: ProductImportItem[] = [];
  const productKeys = new Map<string, number>();
  const allDrinksSortOrders = new Map<number, string>();
  const categorySortOrders = new Map<string, string>();
  const missingMainPhotoProducts: DraftProduct[] = [];

  for (const oldCategoryName of Object.keys(oldToTargetCategoryName)) {
    if (!sourceCategoryNames.has(oldCategoryName)) {
      errors.push(`В draft JSON нет ожидаемой категории ${oldCategoryName}.`);
    }
  }

  for (const category of catalog.categories) {
    if (!getTargetCategoryName(category.name)) {
      errors.push(`Для категории ${category.name} нет маппинга на категорию проекта.`);
    }

    if (!Number.isInteger(category.sortOrder) || category.sortOrder < 0) {
      errors.push(`Категория ${category.name}: sortOrder должен быть целым числом >= 0.`);
    }
  }

  for (const product of catalog.products) {
    const targetCategoryName = getTargetCategoryName(product.category);
    const productContext = `${product.category} / ${product.name}`;

    if (!targetCategoryName) {
      errors.push(`${productContext}: нет маппинга категории.`);
      continue;
    }

    const productKey = `${targetCategoryName}|${product.name}`;
    productKeys.set(productKey, (productKeys.get(productKey) ?? 0) + 1);

    if (product.source !== "old-html-catalog") {
      warnings.push(`${productContext}: неожиданный source ${product.source}.`);
    }

    if (!product.name.trim()) {
      errors.push(`${productContext}: название товара пустое.`);
    }

    if (product.priceRub === null || product.priceRub <= 0 || !Number.isInteger(product.priceRub)) {
      if (product.status === "draft") {
        warnings.push(`${productContext}: у черновика нет корректной цены.`);
      } else {
        errors.push(`${productContext}: цена обязательна для нечернового товара.`);
      }
    }

    if (
      product.packQuantity === null ||
      product.packQuantity <= 0 ||
      !Number.isInteger(product.packQuantity)
    ) {
      if (product.status === "draft") {
        warnings.push(`${productContext}: у черновика нет корректного количества штук в уп.`);
      } else {
        errors.push(`${productContext}: количество штук в уп обязательно для нечернового товара.`);
      }
    }

    if (!Number.isInteger(product.allDrinksSortOrder) || product.allDrinksSortOrder < 0) {
      errors.push(`${productContext}: allDrinksSortOrder должен быть целым числом >= 0.`);
    } else if (allDrinksSortOrders.has(product.allDrinksSortOrder)) {
      warnings.push(
        `${productContext}: allDrinksSortOrder повторяет товар ${allDrinksSortOrders.get(
          product.allDrinksSortOrder
        )}.`
      );
    } else {
      allDrinksSortOrders.set(product.allDrinksSortOrder, productContext);
    }

    const categorySortKey = `${targetCategoryName}|${product.categorySortOrder}`;
    if (!Number.isInteger(product.categorySortOrder) || product.categorySortOrder < 0) {
      errors.push(`${productContext}: categorySortOrder должен быть целым числом >= 0.`);
    } else if (categorySortOrders.has(categorySortKey)) {
      warnings.push(
        `${productContext}: categorySortOrder повторяет товар ${categorySortOrders.get(
          categorySortKey
        )}.`
      );
    } else {
      categorySortOrders.set(categorySortKey, productContext);
    }

    let mainImageStoragePath: string | null = null;

    if (!product.mainPhotoFile) {
      missingMainPhotoProducts.push(product);

      if (product.status !== "draft") {
        errors.push(`${productContext}: основной файл фото обязателен для нечернового товара.`);
      }
    } else {
      assertSafePhotoFileName(product.mainPhotoFile, productContext, errors);
      const photoFile = photosByName.get(product.mainPhotoFile);

      if (!photoFile) {
        errors.push(`${productContext}: файл ${product.mainPhotoFile} не найден.`);
      } else if (!photoFile.isSupportedImage) {
        errors.push(`${productContext}: файл ${product.mainPhotoFile} не является JPG, PNG или WebP.`);
      } else if (photoFile.sizeBytes > maxImageSizeBytes) {
        errors.push(`${productContext}: файл ${product.mainPhotoFile} больше 5 МБ.`);
      } else if (photoFile.mimeType) {
        usedPhotoFileNames.add(product.mainPhotoFile);
        mainImageStoragePath = createStoragePath(product.mainPhotoFile);
        photoItemsByFileName.set(product.mainPhotoFile, {
          fileName: product.mainPhotoFile,
          storagePath: mainImageStoragePath,
          originalName: product.mainPhotoFile,
          mimeType: photoFile.mimeType,
          sizeBytes: photoFile.sizeBytes,
          width: null,
          height: null
        });
      }
    }

    if (product.hasFlavorChoice && product.flavors.length === 0) {
      errors.push(`${productContext}: включен выбор вкуса, но список вкусов пуст.`);
    }

    if (!product.hasFlavorChoice && product.flavors.length > 0) {
      warnings.push(`${productContext}: вкусы есть, но hasFlavorChoice выключен.`);
    }

    const flavorNames = new Map<string, number>();
    const flavorSortOrders = new Map<number, string>();
    const flavors: FlavorImportItem[] = [];

    for (const flavor of product.flavors) {
      const flavorContext = `${productContext} / ${flavor.name}`;
      flavorNames.set(flavor.name, (flavorNames.get(flavor.name) ?? 0) + 1);

      if (!flavor.name.trim()) {
        errors.push(`${flavorContext}: название вкуса пустое.`);
      }

      if (
        flavor.priceRub !== null &&
        (!Number.isInteger(flavor.priceRub) || flavor.priceRub <= 0)
      ) {
        errors.push(`${flavorContext}: отдельная цена вкуса должна быть целым числом > 0.`);
      }

      if (!Number.isInteger(flavor.sortOrder) || flavor.sortOrder < 0) {
        errors.push(`${flavorContext}: sortOrder должен быть целым числом >= 0.`);
      } else if (flavorSortOrders.has(flavor.sortOrder)) {
        warnings.push(
          `${flavorContext}: sortOrder повторяет вкус ${flavorSortOrders.get(flavor.sortOrder)}.`
        );
      } else {
        flavorSortOrders.set(flavor.sortOrder, flavor.name);
      }

      let imageStoragePath: string | null = null;

      if (flavor.photoFile) {
        assertSafePhotoFileName(flavor.photoFile, flavorContext, errors);
        const photoFile = photosByName.get(flavor.photoFile);

        if (!photoFile) {
          errors.push(`${flavorContext}: файл ${flavor.photoFile} не найден.`);
        } else if (!photoFile.isSupportedImage) {
          errors.push(`${flavorContext}: файл ${flavor.photoFile} не является JPG, PNG или WebP.`);
        } else if (photoFile.sizeBytes > maxImageSizeBytes) {
          errors.push(`${flavorContext}: файл ${flavor.photoFile} больше 5 МБ.`);
        } else if (photoFile.mimeType) {
          usedPhotoFileNames.add(flavor.photoFile);
          imageStoragePath = createStoragePath(flavor.photoFile);
          photoItemsByFileName.set(flavor.photoFile, {
            fileName: flavor.photoFile,
            storagePath: imageStoragePath,
            originalName: flavor.photoFile,
            mimeType: photoFile.mimeType,
            sizeBytes: photoFile.sizeBytes,
            width: null,
            height: null
          });
        }
      } else if (!flavor.usesMainPhotoFallback) {
        warnings.push(`${flavorContext}: нет отдельного фото и не отмечен fallback на основное фото.`);
      }

      flavors.push({
        flavor,
        imageStoragePath
      });
    }

    for (const [flavorName, count] of flavorNames) {
      if (count > 1) {
        errors.push(`${productContext}: вкус ${flavorName} повторяется ${count} раза.`);
      }
    }

    productItems.push({
      product,
      targetCategoryName,
      mainImageStoragePath,
      flavors
    });
  }

  for (const [productKey, count] of productKeys) {
    if (count > 1) {
      errors.push(`Товар ${productKey} повторяется ${count} раза.`);
    }
  }

  const expectedSummary = catalog.summary;
  const productsWithFlavors = countProductsWithFlavors(catalog.products);
  const flavorOptions = countFlavorOptions(catalog.products);
  const flavorFallbacks = countFlavorFallbacks(catalog.products);
  const draftProducts = countDraftProducts(catalog.products);

  if (expectedSummary.categories !== catalog.categories.length) {
    warnings.push(
      `summary.categories=${expectedSummary.categories}, фактически ${catalog.categories.length}.`
    );
  }

  if (expectedSummary.products !== catalog.products.length) {
    warnings.push(
      `summary.products=${expectedSummary.products}, фактически ${catalog.products.length}.`
    );
  }

  if (expectedSummary.productsWithFlavors !== productsWithFlavors) {
    warnings.push(
      `summary.productsWithFlavors=${expectedSummary.productsWithFlavors}, фактически ${productsWithFlavors}.`
    );
  }

  if (expectedSummary.flavorOptions !== flavorOptions) {
    warnings.push(
      `summary.flavorOptions=${expectedSummary.flavorOptions}, фактически ${flavorOptions}.`
    );
  }

  if (expectedSummary.flavorPhotoFallbacks !== flavorFallbacks) {
    warnings.push(
      `summary.flavorPhotoFallbacks=${expectedSummary.flavorPhotoFallbacks}, фактически ${flavorFallbacks}.`
    );
  }

  if (expectedSummary.draftProducts !== draftProducts) {
    warnings.push(
      `summary.draftProducts=${expectedSummary.draftProducts}, фактически ${draftProducts}.`
    );
  }

  if (expectedSummary.missingMainPhotoIds !== missingMainPhotoProducts.length) {
    warnings.push(
      `summary.missingMainPhotoIds=${expectedSummary.missingMainPhotoIds}, фактически ${missingMainPhotoProducts.length}.`
    );
  }

  const sourcePhotoFiles = photoFiles.filter(
    (file) => file.fileName.toLowerCase() !== "readme.txt"
  );
  const unusedPhotoFiles = sourcePhotoFiles.filter(
    (file) => !usedPhotoFileNames.has(file.fileName)
  );

  if (expectedSummary.photoFiles !== sourcePhotoFiles.length) {
    warnings.push(
      `summary.photoFiles=${expectedSummary.photoFiles}, фактически исходных фото ${sourcePhotoFiles.length}.`
    );
  }

  if (expectedSummary.unusedPhotoFiles !== unusedPhotoFiles.length) {
    warnings.push(
      `summary.unusedPhotoFiles=${expectedSummary.unusedPhotoFiles}, фактически ${unusedPhotoFiles.length}.`
    );
  }

  return {
    plan: {
      catalog,
      photoFiles,
      photosByName,
      photoItems: Array.from(photoItemsByFileName.values()).sort((first, second) =>
        first.storagePath.localeCompare(second.storagePath)
      ),
      productItems,
      unusedPhotoFiles,
      missingMainPhotoProducts,
      readyProductsCount: catalog.products.filter(isProductReadyForClient).length,
      draftProductsCount: draftProducts,
      flavorsCount: flavorOptions,
      flavorFallbacksCount: flavorFallbacks
    },
    errors,
    warnings
  };
}

function createMapList(values: string[]) {
  const map = new Map<string, number>();

  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }

  return map;
}

function countDuplicates(values: string[]) {
  return Array.from(createMapList(values).values()).filter((count) => count > 1).length;
}

async function compareWithDatabase(plan: ImportPlan): Promise<DatabaseComparison> {
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [dbCategories, dbImages, dbProducts, dbFlavors] = await Promise.all([
      db.select().from(categories),
      db.select().from(images),
      db.select().from(products),
      db.select().from(productFlavors)
    ]);

    return buildDatabaseComparison(plan, dbCategories, dbImages, dbProducts, dbFlavors);
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

function buildDatabaseComparison(
  plan: ImportPlan,
  dbCategories: DbCategory[],
  dbImages: DbImage[],
  dbProducts: DbProduct[],
  dbFlavors: DbFlavor[]
): DatabaseComparison {
  const errors: string[] = [];
  const categoryByName = new Map(dbCategories.map((category) => [category.name, category]));
  const targetCategoryNames = Array.from(
    new Set(plan.productItems.map((item) => item.targetCategoryName))
  );
  const missingCategoryNames = targetCategoryNames.filter(
    (categoryName) => !categoryByName.has(categoryName)
  );

  if (missingCategoryNames.length > 0) {
    errors.push(`В базе нет категорий: ${missingCategoryNames.join(", ")}.`);
  }

  const imagePathCounts = createMapList(dbImages.map((image) => image.storagePath));

  for (const [storagePath, count] of imagePathCounts) {
    if (count > 1) {
      errors.push(`В базе найдено несколько images с storage_path=${storagePath}.`);
    }
  }

  const existingImagePaths = new Set(dbImages.map((image) => image.storagePath));
  const imageCreateCount = plan.photoItems.filter(
    (item) => !existingImagePaths.has(item.storagePath)
  ).length;
  const imageUpdateCount = plan.photoItems.length - imageCreateCount;
  const activeDbProducts = dbProducts.filter((product) => product.deletedAt === null);
  const dbProductKeys = activeDbProducts.map(
    (product) => `${product.categoryId ?? "null"}|${product.name}`
  );
  const dbProductKeyCounts = createMapList(dbProductKeys);

  for (const [productKey, count] of dbProductKeyCounts) {
    if (count > 1) {
      errors.push(`В базе найдено несколько активных товаров с ключом ${productKey}.`);
    }
  }

  let productsToCreate = 0;
  let productsToUpdate = 0;
  let flavorsToCreate = 0;
  let flavorsToUpdate = 0;

  for (const item of plan.productItems) {
    const category = categoryByName.get(item.targetCategoryName);

    if (!category) {
      continue;
    }

    const matchingProducts = activeDbProducts.filter(
      (product) => product.categoryId === category.id && product.name === item.product.name
    );

    if (matchingProducts.length === 0) {
      productsToCreate += 1;
      flavorsToCreate += item.flavors.length;
      continue;
    }

    if (matchingProducts.length > 1) {
      continue;
    }

    productsToUpdate += 1;
    const existingProduct = matchingProducts[0];
    const flavorsForProduct = dbFlavors.filter(
      (flavor) => flavor.productId === existingProduct.id
    );
    const flavorNameCounts = createMapList(flavorsForProduct.map((flavor) => flavor.name));

    for (const [flavorName, count] of flavorNameCounts) {
      if (count > 1) {
        errors.push(
          `В базе найдено несколько вкусов ${flavorName} у товара ${item.product.name}.`
        );
      }
    }

    for (const flavorItem of item.flavors) {
      const existingFlavors = flavorsForProduct.filter(
        (flavor) => flavor.name === flavorItem.flavor.name
      );

      if (existingFlavors.length === 0) {
        flavorsToCreate += 1;
      } else if (existingFlavors.length === 1) {
        flavorsToUpdate += 1;
      }
    }
  }

  return {
    errors,
    categories: {
      existing: targetCategoryNames.length - missingCategoryNames.length,
      missing: missingCategoryNames
    },
    images: {
      create: imageCreateCount,
      update: imageUpdateCount
    },
    products: {
      create: productsToCreate,
      update: productsToUpdate,
      draft: plan.draftProductsCount
    },
    flavors: {
      create: flavorsToCreate,
      update: flavorsToUpdate
    }
  };
}

function formatList(items: string[]) {
  if (items.length === 0) {
    return "- нет";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function buildReport(
  validation: ValidationResult,
  comparison: DatabaseComparison | null
) {
  const { plan, errors, warnings } = validation;
  const targetCategoryNames = Array.from(
    new Set(plan.productItems.map((item) => item.targetCategoryName))
  );
  const unusedFiles = plan.unusedPhotoFiles.map((file) => file.fileName);
  const serviceFiles = plan.photoFiles
    .filter((file) => file.fileName.toLowerCase() === "readme.txt")
    .map((file) => file.fileName);
  const missingPhotos = plan.missingMainPhotoProducts.map(
    (product) => `${product.category} / ${product.name} (${product.mainPhotoId ?? "без photoId"})`
  );
  const productDuplicateCount = countDuplicates(
    plan.productItems.map((item) => `${item.targetCategoryName}|${item.product.name}`)
  );
  const flavorDuplicateCount = plan.productItems.reduce((count, item) => {
    const duplicateCount = countDuplicates(
      item.flavors.map((flavorItem) => flavorItem.flavor.name)
    );

    return count + duplicateCount;
  }, 0);

  return `# Отчет по подготовке импорта старого каталога

Дата формирования: 2026-06-06

## Режим

Dry-run без записи в Supabase.

Финальная загрузка реальных товаров и фото не выполнялась.

## Источники

- Draft JSON: \`data/import/old-catalog-products.draft.json\`
- Фото: \`data/source-old-catalog/photos/\`
- Storage bucket: \`product-images\`

## Итоги draft-данных

- Категорий в JSON: ${plan.catalog.categories.length}
- Товаров в JSON: ${plan.catalog.products.length}
- Товаров с выбором вкусов: ${countProductsWithFlavors(plan.catalog.products)}
- Вкусов: ${plan.flavorsCount}
- Локальных файлов в папке photos: ${plan.photoFiles.length}
- Исходных файлов фото без README: ${plan.photoFiles.filter((file) => file.fileName.toLowerCase() !== "readme.txt").length}
- Фото к подготовке для Storage: ${plan.photoItems.length}
- Товаров, готовых к клиентскому каталогу: ${plan.readyProductsCount}
- Товаров, которые останутся черновиками: ${plan.draftProductsCount}
- Вкусов с fallback на основное фото: ${plan.flavorFallbacksCount}

## Маппинг категорий

${Object.entries(oldToTargetCategoryName)
  .map(([oldName, targetName]) => `- ${oldName} -> ${targetName}`)
  .join("\n")}

Целевые категории:

${formatList(targetCategoryNames)}

## Проверка дублей

- Дублей товаров по ключу категория + название: ${productDuplicateCount}
- Дублей вкусов внутри одного товара: ${flavorDuplicateCount}

## Товары без основного фото

${formatList(missingPhotos)}

## Неиспользуемые файлы

${formatList(unusedFiles)}

## Служебные файлы в photos

${formatList(serviceFiles)}

## План Storage

- Storage path: \`old-catalog/<имя-файла>\`
- Размеры изображений не извлекаются на этом этапе, поля \`width\` и \`height\` остаются пустыми.
- Фото вкуса не создается отдельно, если вкус использует fallback на основное фото товара.

## Dry-run по Supabase

${formatDatabaseComparison(comparison)}

## Ошибки

${formatList([...errors, ...(comparison?.errors ?? [])])}

## Предупреждения

${formatList(warnings)}
`;
}

function formatDatabaseComparison(comparison: DatabaseComparison | null) {
  if (!comparison) {
    return "Сравнение с Supabase не выполнялось.";
  }

  return `- Категории найдены: ${comparison.categories.existing}
- Категории отсутствуют: ${comparison.categories.missing.length}
- Images к созданию: ${comparison.images.create}
- Images к обновлению: ${comparison.images.update}
- Товары к созданию: ${comparison.products.create}
- Товары к обновлению: ${comparison.products.update}
- Товары-черновики среди импортируемых: ${comparison.products.draft}
- Вкусы к созданию: ${comparison.flavors.create}
- Вкусы к обновлению: ${comparison.flavors.update}`;
}

async function runValidate() {
  const catalog = await loadDraftCatalog();
  const photoFiles = await loadPhotoFiles();
  const validation = validateAndCreatePlan(catalog, photoFiles);

  printValidationSummary(validation);

  if (validation.errors.length > 0) {
    process.exitCode = 1;
  }
}

async function runDryRun() {
  const catalog = await loadDraftCatalog();
  const photoFiles = await loadPhotoFiles();
  const validation = validateAndCreatePlan(catalog, photoFiles);

  if (validation.errors.length > 0) {
    printValidationSummary(validation);
    process.exitCode = 1;
    return;
  }

  const comparison = await compareWithDatabase(validation.plan);

  if (comparison.errors.length > 0) {
    printValidationSummary(validation);
    console.error("Dry-run остановлен из-за неоднозначного состояния Supabase.");
    for (const error of comparison.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const report = buildReport(validation, comparison);
  await writeFile(reportPath, report, "utf8");

  console.log("Dry-run импорта старого каталога выполнен без записи в Supabase.");
  console.log(`Отчет обновлен: ${path.relative(process.cwd(), reportPath)}`);
  console.log(`Категорий найдено: ${comparison.categories.existing}.`);
  console.log(
    `Images: создать ${comparison.images.create}, обновить ${comparison.images.update}.`
  );
  console.log(
    `Товары: создать ${comparison.products.create}, обновить ${comparison.products.update}, черновики ${comparison.products.draft}.`
  );
  console.log(
    `Вкусы: создать ${comparison.flavors.create}, обновить ${comparison.flavors.update}.`
  );

  if (validation.warnings.length > 0) {
    console.log(`Предупреждений: ${validation.warnings.length}.`);
  }
}

function printValidationSummary(validation: ValidationResult) {
  const { plan, errors, warnings } = validation;

  console.log("Проверка draft-данных старого каталога завершена.");
  console.log(`Категорий: ${plan.catalog.categories.length}.`);
  console.log(`Товаров: ${plan.catalog.products.length}.`);
  console.log(`Готово к клиентскому каталогу: ${plan.readyProductsCount}.`);
  console.log(`Черновиков: ${plan.draftProductsCount}.`);
  console.log(`Вкусов: ${plan.flavorsCount}.`);
  console.log(`Фото к подготовке: ${plan.photoItems.length}.`);
  console.log(`Неиспользуемых файлов: ${plan.unusedPhotoFiles.length}.`);
  console.log(`Ошибок: ${errors.length}.`);
  console.log(`Предупреждений: ${warnings.length}.`);

  if (errors.length > 0) {
    console.error("Ошибки:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
  }

  if (warnings.length > 0) {
    console.warn("Предупреждения:");
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }
}

async function runWrite() {
  if (!process.argv.includes("--confirm-write=OLD_CATALOG_IMPORT")) {
    throw new Error(
      "Для реальной записи нужен флаг --confirm-write=OLD_CATALOG_IMPORT. В этом work plan запись не запускается."
    );
  }

  const catalog = await loadDraftCatalog();
  const photoFiles = await loadPhotoFiles();
  const validation = validateAndCreatePlan(catalog, photoFiles);

  if (validation.errors.length > 0) {
    printValidationSummary(validation);
    process.exitCode = 1;
    return;
  }

  await writeImportToSupabase(validation.plan);
}

async function writeImportToSupabase(plan: ImportPlan) {
  const { db, queryClient } = createDatabaseConnection();
  const supabase = createSupabaseAdminClient();
  const bucketName = getSupabaseStorageBucketName();

  try {
    const [dbCategories, dbImages, dbProducts, dbFlavors] = await Promise.all([
      db.select().from(categories),
      db.select().from(images),
      db.select().from(products),
      db.select().from(productFlavors)
    ]);
    const comparison = buildDatabaseComparison(
      plan,
      dbCategories,
      dbImages,
      dbProducts,
      dbFlavors
    );

    if (comparison.errors.length > 0 || comparison.categories.missing.length > 0) {
      throw new Error(
        `Запись остановлена: ${[
          ...comparison.errors,
          ...comparison.categories.missing.map((category) => `нет категории ${category}`)
        ].join("; ")}`
      );
    }

    const imageIdByStoragePath = new Map<string, string>();
    const existingImageByStoragePath = new Map(
      dbImages.map((image) => [image.storagePath, image])
    );

    for (const photoItem of plan.photoItems) {
      const fileBuffer = await readFile(path.join(photosDirectoryPath, photoItem.fileName));
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(photoItem.storagePath, fileBuffer, {
          contentType: photoItem.mimeType,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const publicUrl = supabase.storage.from(bucketName).getPublicUrl(photoItem.storagePath)
        .data.publicUrl;
      const existingImage = existingImageByStoragePath.get(photoItem.storagePath);

      if (existingImage) {
        const [updatedImage] = await db
          .update(images)
          .set({
            publicUrl,
            originalName: photoItem.originalName,
            mimeType: photoItem.mimeType,
            sizeBytes: photoItem.sizeBytes,
            width: photoItem.width,
            height: photoItem.height
          })
          .where(eq(images.id, existingImage.id))
          .returning();

        imageIdByStoragePath.set(photoItem.storagePath, updatedImage.id);
      } else {
        const [createdImage] = await db
          .insert(images)
          .values({
            storagePath: photoItem.storagePath,
            publicUrl,
            originalName: photoItem.originalName,
            mimeType: photoItem.mimeType,
            sizeBytes: photoItem.sizeBytes,
            width: photoItem.width,
            height: photoItem.height
          })
          .returning();

        imageIdByStoragePath.set(photoItem.storagePath, createdImage.id);
      }
    }

    const categoryByName = new Map(dbCategories.map((category) => [category.name, category]));
    const activeDbProducts = dbProducts.filter((product) => product.deletedAt === null);
    let createdProducts = 0;
    let updatedProducts = 0;
    let createdFlavors = 0;
    let updatedFlavors = 0;

    for (const item of plan.productItems) {
      const category = categoryByName.get(item.targetCategoryName);

      if (!category) {
        throw new Error(`Нет категории ${item.targetCategoryName}.`);
      }

      const existingProduct = activeDbProducts.find(
        (product) => product.categoryId === category.id && product.name === item.product.name
      );
      const now = new Date();
      const mainImageId = item.mainImageStoragePath
        ? imageIdByStoragePath.get(item.mainImageStoragePath) ?? null
        : null;
      const productValues = {
        name: item.product.name,
        categoryId: category.id,
        priceRub: item.product.priceRub,
        packQuantity: item.product.packQuantity,
        mainImageId,
        status: item.product.status,
        hasFlavorChoice: item.product.hasFlavorChoice,
        allDrinksSortOrder: item.product.allDrinksSortOrder,
        categorySortOrder: item.product.categorySortOrder,
        updatedAt: now
      };

      const savedProduct = existingProduct
        ? (
            await db
              .update(products)
              .set(productValues)
              .where(eq(products.id, existingProduct.id))
              .returning()
          )[0]
        : (
            await db
              .insert(products)
              .values(productValues)
              .returning()
          )[0];

      if (existingProduct) {
        updatedProducts += 1;
      } else {
        createdProducts += 1;
      }

      const existingFlavors = dbFlavors.filter(
        (flavor) => flavor.productId === savedProduct.id
      );

      for (const flavorItem of item.flavors) {
        const existingFlavor = existingFlavors.find(
          (flavor) => flavor.name === flavorItem.flavor.name
        );
        const imageId = flavorItem.imageStoragePath
          ? imageIdByStoragePath.get(flavorItem.imageStoragePath) ?? null
          : null;
        const flavorValues = {
          productId: savedProduct.id,
          name: flavorItem.flavor.name,
          priceRub: flavorItem.flavor.priceRub,
          imageId,
          isOutOfStock: flavorItem.flavor.isOutOfStock,
          sortOrder: flavorItem.flavor.sortOrder,
          updatedAt: now
        };

        if (existingFlavor) {
          await db
            .update(productFlavors)
            .set(flavorValues)
            .where(eq(productFlavors.id, existingFlavor.id));
          updatedFlavors += 1;
        } else {
          await db.insert(productFlavors).values(flavorValues);
          createdFlavors += 1;
        }
      }
    }

    console.log("Импорт старого каталога записан в Supabase.");
    console.log(`Товары: создано ${createdProducts}, обновлено ${updatedProducts}.`);
    console.log(`Вкусы: создано ${createdFlavors}, обновлено ${updatedFlavors}.`);
    console.log(`Фото: подготовлено ${plan.photoItems.length}.`);
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

async function main() {
  if (process.argv.includes("--validate")) {
    await runValidate();
    return;
  }

  if (process.argv.includes("--dry-run")) {
    await runDryRun();
    return;
  }

  if (process.argv.includes("--write")) {
    await runWrite();
    return;
  }

  throw new Error("Укажите режим: --validate, --dry-run или --write.");
}

main().catch((error: unknown) => {
  console.error("Не удалось выполнить подготовку импорта старого каталога.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
