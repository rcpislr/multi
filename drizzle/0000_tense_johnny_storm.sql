CREATE TYPE "public"."line_type" AS ENUM('paid', 'gift', 'addon', 'shipping', 'cod_fee');--> statement-breakpoint
CREATE TYPE "public"."order_event_type" AS ENUM('created', 'status_changed', 'edited');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('dogrulama_bekliyor', 'dogrulanmadi', 'yeni', 'onaylandi', 'kargoda', 'teslim_edildi', 'iptal', 'iade');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cod_cash', 'cod_card', 'online');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('tahsil_bekliyor', 'tahsil_edildi', 'tahsil_edilemedi', 'baslatildi', 'basarili', 'basarisiz', 'terk', 'iade', 'kismi_iade');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('taslak', 'aktif', 'arsiv');--> statement-breakpoint
CREATE TYPE "public"."site_status" AS ENUM('taslak', 'yayinda', 'kapali', 'yonlendir');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'operator');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addon_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"addon_id" integer NOT NULL,
	"qty" integer NOT NULL,
	"price_minor" integer NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addons" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"vat_rate" integer DEFAULT 20 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"business_info" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domains_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"slot_key" text NOT NULL,
	"version" integer NOT NULL,
	"label" text NOT NULL,
	"badge" text,
	"paid_qty" integer NOT NULL,
	"free_qty" integer DEFAULT 0 NOT NULL,
	"total_price_minor" integer NOT NULL,
	"free_shipping" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"type" "order_event_type" NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status",
	"diff" jsonb,
	"actor_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"line_type" "line_type" NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_list_price_minor" integer NOT NULL,
	"unit_price_minor" integer NOT NULL,
	"line_total_minor" integer NOT NULL,
	"vat_rate" integer NOT NULL,
	"vat_minor" integer NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"offer_id" integer,
	"addon_option_id" integer
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_no" text NOT NULL,
	"public_token" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"site_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"offer_id" integer NOT NULL,
	"status" "order_status" NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"address" text NOT NULL,
	"email" text,
	"subtotal_minor" integer NOT NULL,
	"discount_minor" integer NOT NULL,
	"shipping_minor" integer NOT NULL,
	"cod_fee_minor" integer NOT NULL,
	"vat_total_minor" integer NOT NULL,
	"grand_total_minor" integer NOT NULL,
	"pricing_snapshot" jsonb NOT NULL,
	"pricing_engine_version" integer NOT NULL,
	"policy_accepted_at" timestamp with time zone NOT NULL,
	"ip" text NOT NULL,
	"user_agent" text NOT NULL,
	"utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"internal_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no"),
	CONSTRAINT "orders_public_token_unique" UNIQUE("public_token"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"vat_rate" integer DEFAULT 20 NOT NULL,
	"cost_minor" integer DEFAULT 0 NOT NULL,
	"unit_price_minor" integer NOT NULL,
	"track_stock" boolean DEFAULT false NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"cod_fee_enabled" boolean DEFAULT false NOT NULL,
	"cod_fee_cash_minor" integer DEFAULT 0 NOT NULL,
	"cod_fee_card_minor" integer DEFAULT 0 NOT NULL,
	"content" jsonb NOT NULL,
	"status" "product_status" DEFAULT 'taslak' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"business_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"legal_texts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shipping_fee_minor" integer DEFAULT 0 NOT NULL,
	"free_shipping_threshold_minor" integer,
	"shipping_vat_rate" integer DEFAULT 20 NOT NULL,
	"cookie_banner_enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer NOT NULL,
	"subdomain" text NOT NULL,
	"product_id" integer NOT NULL,
	"status" "site_status" DEFAULT 'taslak' NOT NULL,
	"redirect_url" text,
	"meta_pixel_id" text,
	"meta_capi_token" text,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'operator' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_options" ADD CONSTRAINT "addon_options_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addons" ADD CONSTRAINT "addons_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_addon_option_id_addon_options_id_fk" FOREIGN KEY ("addon_option_id") REFERENCES "public"."addon_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "offers_product_slot_version" ON "offers" USING btree ("product_id","slot_key","version");--> statement-breakpoint
CREATE INDEX "orders_created_at" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_phone" ON "orders" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "orders_site" ON "orders" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_domain_subdomain" ON "sites" USING btree ("domain_id","subdomain");