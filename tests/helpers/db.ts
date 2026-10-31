import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { emptyProductContent } from "@/content/schema";
import { domains, products, offers, addons, addonOptions, sites, settings } from "@/db/schema";

const TABLES = [
  "order_events", "order_items", "orders", "sites", "addon_options", "addons", "offers", "products",
  "domains", "settings", "session", "account", "verification", '"user"',
];

export async function resetDb(): Promise<void> {
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`));
}

export async function seedBasic() {
  await db.insert(settings).values({ id: 1, businessInfo: {}, legalTexts: {}, shippingFeeMinor: 4990, freeShippingThresholdMinor: null });
  const [domain] = await db.insert(domains).values({ name: "localhost" }).returning();
  const content = emptyProductContent();
  content.hero = { title: "Mini Poşet Kapatıcı", subtitle: "Tek dokunuşla kapat, tazeliği koru.", ctaLabel: "Hemen Sipariş Ver" };
  content.faq = [{ q: "Pil dahil mi?", a: "Hayır, 2 adet AA pil ile çalışır." }];
  const [product] = await db.insert(products).values({
    name: "Mini Poşet Kapatıcı", sku: "PK1", vatRate: 20, costMinor: 9000, unitPriceMinor: 39900,
    trackStock: false, stockQty: 0, codFeeEnabled: false, codFeeCashMinor: 0, codFeeCardMinor: 0,
    content, status: "aktif",
  }).returning();
  const pid = product!.id;
  const [one, two, threeForTwo] = await db.insert(offers).values([
    { productId: pid, slotKey: "one", version: 1, label: "1 Adet", paidQty: 1, freeQty: 0, totalPriceMinor: 39900, freeShipping: false, sortOrder: 1, isDefault: false },
    { productId: pid, slotKey: "two", version: 1, label: "2 Adet", paidQty: 2, freeQty: 0, totalPriceMinor: 59900, freeShipping: true, sortOrder: 2, isDefault: true },
    { productId: pid, slotKey: "3al2", version: 1, label: "3 Al 2 Öde", paidQty: 2, freeQty: 1, totalPriceMinor: 59900, freeShipping: true, sortOrder: 3, isDefault: false },
  ]).returning();
  const [addon] = await db.insert(addons).values({ productId: pid, name: "Deterjan Hazneli Fırça", sku: "FR1", vatRate: 20, description: "" }).returning();
  const [ao1, ao2] = await db.insert(addonOptions).values([
    { addonId: addon!.id, qty: 1, priceMinor: 10000, label: "1 Adet", sortOrder: 1 },
    { addonId: addon!.id, qty: 2, priceMinor: 20000, label: "2 Adet", sortOrder: 2 },
  ]).returning();
  const [site] = await db.insert(sites).values({
    domainId: domain!.id, subdomain: "poset", productId: pid, status: "yayinda", theme: {}, contentOverrides: {}, priceOverrides: {},
  }).returning();
  return {
    domainId: domain!.id, productId: pid,
    offerIds: { one: one!.id, two: two!.id, threeForTwo: threeForTwo!.id },
    addonOptionIds: { one: ao1!.id, two: ao2!.id }, addonId: addon!.id, siteId: site!.id,
  };
}
