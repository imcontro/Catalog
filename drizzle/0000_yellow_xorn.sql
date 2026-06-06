CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'out_of_stock', 'hidden', 'draft');--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_sort_order_non_negative" CHECK ("sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_flavors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_rub" integer,
	"image_id" uuid,
	"is_out_of_stock" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_flavors_price_rub_positive" CHECK ("price_rub" is null or "price_rub" > 0),
	CONSTRAINT "product_flavors_sort_order_non_negative" CHECK ("sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid,
	"price_rub" integer,
	"pack_quantity" integer,
	"main_image_id" uuid,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"has_flavor_choice" boolean DEFAULT false NOT NULL,
	"all_drinks_sort_order" integer DEFAULT 0 NOT NULL,
	"category_sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "products_price_rub_positive" CHECK ("price_rub" is null or "price_rub" > 0),
	CONSTRAINT "products_pack_quantity_positive" CHECK ("pack_quantity" is null or "pack_quantity" > 0),
	CONSTRAINT "products_all_drinks_sort_order_non_negative" CHECK ("all_drinks_sort_order" >= 0),
	CONSTRAINT "products_category_sort_order_non_negative" CHECK ("category_sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_flavors" ADD CONSTRAINT "product_flavors_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_flavors" ADD CONSTRAINT "product_flavors_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_main_image_id_images_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "categories_sort_order_idx" ON "categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "product_flavors_product_id_idx" ON "product_flavors" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_flavors_sort_order_idx" ON "product_flavors" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_deleted_at_idx" ON "products" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "products_all_drinks_sort_order_idx" ON "products" USING btree ("all_drinks_sort_order");--> statement-breakpoint
CREATE INDEX "products_category_sort_order_idx" ON "products" USING btree ("category_sort_order");--> statement-breakpoint
INSERT INTO "categories" ("name", "sort_order") VALUES
	('вода', 0),
	('газировки', 1),
	('лимонады', 2),
	('чай', 3),
	('натуральные напитки', 4),
	('энергетики', 5),
	('разные напитки', 6)
ON CONFLICT ("name") DO UPDATE SET
	"sort_order" = EXCLUDED."sort_order",
	"updated_at" = now();
