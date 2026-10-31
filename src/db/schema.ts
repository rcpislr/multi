import {
  pgTable, serial, integer, text, boolean, jsonb, timestamp, uniqueIndex, index, pgEnum,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

export const productStatus = pgEnum("product_status", ["taslak", "aktif", "arsiv"]);
export const siteStatus = pgEnum("site_status", ["taslak", "yayinda", "kapali", "yonlendir"]);
export const orderStatus = pgEnum("order_status", [
  "dogrulama_bekliyor", "dogrulanmadi", "yeni", "onaylandi", "kargoda", "teslim_edildi", "iptal", "iade",
]);
export const paymentMethod = pgEnum("payment_method", ["cod_cash", "cod_card", "online"]);
export const paymentStatus = pgEnum("payment_status", [
  "tahsil_bekliyor", "tahsil_edildi", "tahsil_edilemedi", "baslatildi", "basarili", "basarisiz", "terk", "iade", "kismi_iade",
]);
export const lineType = pgEnum("line_type", ["paid", "gift", "addon", "shipping", "cod_fee"]);
export const orderEventType = pgEnum("order_event_type", ["created", "status_changed", "edited"]);
export const userRole = pgEnum("user_role", ["admin", "operator"]);

export type BusinessInfo = {
  legalName?: string; taxNo?: string; taxOffice?: string; address?: string; phone?: string; email?: string; mersisNo?: string;
};

export const domains = pgTable("domains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
  businessInfo: jsonb("business_info").$type<BusinessInfo | null>(),
  createdAt: createdAt(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  businessInfo: jsonb("business_info").$type<BusinessInfo>().notNull().default({}),
  legalTexts: jsonb("legal_texts").$type<Record<string, string>>().notNull().default({}),
  shippingFeeMinor: integer("shipping_fee_minor").notNull().default(0),
  freeShippingThresholdMinor: integer("free_shipping_threshold_minor"),
  shippingVatRate: integer("shipping_vat_rate").notNull().default(20),
  cookieBannerEnabled: boolean("cookie_banner_enabled").notNull().default(false),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  vatRate: integer("vat_rate").notNull().default(20),
  costMinor: integer("cost_minor").notNull().default(0),
  unitPriceMinor: integer("unit_price_minor").notNull(),
  trackStock: boolean("track_stock").notNull().default(false),
  stockQty: integer("stock_qty").notNull().default(0),
  codFeeEnabled: boolean("cod_fee_enabled").notNull().default(false),
  codFeeCashMinor: integer("cod_fee_cash_minor").notNull().default(0),
  codFeeCardMinor: integer("cod_fee_card_minor").notNull().default(0),
  // typed as ProductContent at the application layer (src/content/schema.ts)
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  status: productStatus("status").notNull().default("taslak"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  slotKey: text("slot_key").notNull(),
  version: integer("version").notNull(),
  label: text("label").notNull(),
  badge: text("badge"),
  paidQty: integer("paid_qty").notNull(),
  freeQty: integer("free_qty").notNull().default(0),
  totalPriceMinor: integer("total_price_minor").notNull(),
  freeShipping: boolean("free_shipping").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (t) => [uniqueIndex("offers_product_slot_version").on(t.productId, t.slotKey, t.version)]);

export const addons = pgTable("addons", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  vatRate: integer("vat_rate").notNull().default(20),
  description: text("description").notNull().default(""),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const addonOptions = pgTable("addon_options", {
  id: serial("id").primaryKey(),
  addonId: integer("addon_id").notNull().references(() => addons.id),
  qty: integer("qty").notNull(),
  priceMinor: integer("price_minor").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull().references(() => domains.id),
  subdomain: text("subdomain").notNull(),
  productId: integer("product_id").notNull().references(() => products.id),
  status: siteStatus("status").notNull().default("taslak"),
  redirectUrl: text("redirect_url"),
  metaPixelId: text("meta_pixel_id"),
  metaCapiToken: text("meta_capi_token"),
  theme: jsonb("theme").$type<Record<string, unknown>>().notNull().default({}),
  contentOverrides: jsonb("content_overrides").$type<Record<string, unknown>>().notNull().default({}),
  priceOverrides: jsonb("price_overrides").$type<Record<string, number>>().notNull().default({}),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("sites_domain_subdomain").on(t.domainId, t.subdomain)]);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(),
  publicToken: text("public_token").notNull().unique(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  siteId: integer("site_id").notNull().references(() => sites.id),
  productId: integer("product_id").notNull().references(() => products.id),
  offerId: integer("offer_id").notNull().references(() => offers.id),
  status: orderStatus("status").notNull(),
  paymentMethod: paymentMethod("payment_method").notNull(),
  paymentStatus: paymentStatus("payment_status").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  district: text("district").notNull(),
  address: text("address").notNull(),
  email: text("email"),
  subtotalMinor: integer("subtotal_minor").notNull(),
  discountMinor: integer("discount_minor").notNull(),
  shippingMinor: integer("shipping_minor").notNull(),
  codFeeMinor: integer("cod_fee_minor").notNull(),
  vatTotalMinor: integer("vat_total_minor").notNull(),
  grandTotalMinor: integer("grand_total_minor").notNull(),
  pricingSnapshot: jsonb("pricing_snapshot").notNull(),
  pricingEngineVersion: integer("pricing_engine_version").notNull(),
  policyAcceptedAt: timestamp("policy_accepted_at", { withTimezone: true }).notNull(),
  ip: text("ip").notNull(),
  userAgent: text("user_agent").notNull(),
  utm: jsonb("utm").$type<Record<string, string>>().notNull().default({}),
  internalNote: text("internal_note").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("orders_created_at").on(t.createdAt),
  index("orders_phone").on(t.phone),
  index("orders_site").on(t.siteId),
]);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  lineType: lineType("line_type").notNull(),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  skuSnapshot: text("sku_snapshot").notNull(),
  qty: integer("qty").notNull(),
  unitListPriceMinor: integer("unit_list_price_minor").notNull(),
  unitPriceMinor: integer("unit_price_minor").notNull(),
  lineTotalMinor: integer("line_total_minor").notNull(),
  vatRate: integer("vat_rate").notNull(),
  vatMinor: integer("vat_minor").notNull(),
  isFree: boolean("is_free").notNull().default(false),
  offerId: integer("offer_id").references(() => offers.id),
  addonOptionId: integer("addon_option_id").references(() => addonOptions.id),
});

export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: orderEventType("type").notNull(),
  fromStatus: orderStatus("from_status"),
  toStatus: orderStatus("to_status"),
  diff: jsonb("diff"),
  actorUserId: text("actor_user_id"),
  createdAt: createdAt(),
});

// ---- Better Auth core tables ----
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("operator"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Domain = typeof domains.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type Addon = typeof addons.$inferSelect;
export type AddonOption = typeof addonOptions.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];
