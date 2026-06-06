import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const productStatus = pgEnum("product_status", [
  "active",
  "out_of_stock",
  "hidden",
  "draft"
]);

function createTimestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  };
}

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    ...createTimestamps()
  },
  (table) => [
    uniqueIndex("categories_name_unique").on(table.name),
    index("categories_sort_order_idx").on(table.sortOrder),
    check("categories_sort_order_non_negative", sql`${table.sortOrder} >= 0`)
  ]
);

export const images = pgTable("images", {
  id: uuid("id").defaultRandom().primaryKey(),
  storagePath: text("storage_path").notNull(),
  publicUrl: text("public_url").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "restrict",
      onUpdate: "cascade"
    }),
    priceRub: integer("price_rub"),
    packQuantity: integer("pack_quantity"),
    mainImageId: uuid("main_image_id").references(() => images.id, {
      onDelete: "set null",
      onUpdate: "cascade"
    }),
    status: productStatus("status").notNull().default("draft"),
    hasFlavorChoice: boolean("has_flavor_choice").notNull().default(false),
    allDrinksSortOrder: integer("all_drinks_sort_order").notNull().default(0),
    categorySortOrder: integer("category_sort_order").notNull().default(0),
    ...createTimestamps(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    index("products_status_idx").on(table.status),
    index("products_deleted_at_idx").on(table.deletedAt),
    index("products_all_drinks_sort_order_idx").on(table.allDrinksSortOrder),
    index("products_category_sort_order_idx").on(table.categorySortOrder),
    check(
      "products_price_rub_positive",
      sql`${table.priceRub} is null or ${table.priceRub} > 0`
    ),
    check(
      "products_pack_quantity_positive",
      sql`${table.packQuantity} is null or ${table.packQuantity} > 0`
    ),
    check(
      "products_all_drinks_sort_order_non_negative",
      sql`${table.allDrinksSortOrder} >= 0`
    ),
    check(
      "products_category_sort_order_non_negative",
      sql`${table.categorySortOrder} >= 0`
    )
  ]
);

export const productFlavors = pgTable(
  "product_flavors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "cascade",
        onUpdate: "cascade"
      }),
    name: text("name").notNull(),
    priceRub: integer("price_rub"),
    imageId: uuid("image_id").references(() => images.id, {
      onDelete: "set null",
      onUpdate: "cascade"
    }),
    isOutOfStock: boolean("is_out_of_stock").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...createTimestamps()
  },
  (table) => [
    index("product_flavors_product_id_idx").on(table.productId),
    index("product_flavors_sort_order_idx").on(table.sortOrder),
    check(
      "product_flavors_price_rub_positive",
      sql`${table.priceRub} is null or ${table.priceRub} > 0`
    ),
    check("product_flavors_sort_order_non_negative", sql`${table.sortOrder} >= 0`)
  ]
);

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionTokenHash: text("session_token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true })
});
