import { beforeEach, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { addonOptions, addons, offers, orderEvents, orderItems, orders, products, sites } from "@/db/schema";
import { emptyProductContent } from "@/content/schema";
import { resetDb, seedBasic } from "../helpers/db";
import { createOrder } from "@/orders/create-order";

type Seed = Awaited<ReturnType<typeof seedBasic>>;
const meta = { ip: "1.2.3.4", userAgent: "test" };
const body = (s: Seed, over: Record<string, unknown> = {}) => ({
  idempotencyKey: randomUUID(), offerId: s.offerIds.threeForTwo, offerVersion: 1, addonOptionIds: [s.addonOptionIds.one],
  customerName: "Ayşe Yılmaz", phone: "0532 123 45 67", city: "istanbul", district: "kadıköy",
  address: "Moda Mah. Örnek Sok. No 1 D 2", paymentMethod: "cod_cash", policyAccepted: true, website: "",
  expectedGrandTotalMinor: 69900, ...over,
});

async function otherProduct() {
  const [p] = await db.insert(products).values({ name: "Diğer", sku: "D", unitPriceMinor: 1000, content: emptyProductContent(), status: "aktif" }).returning();
  const [o] = await db.insert(offers).values({ productId: p!.id, slotKey: "one", version: 1, label: "1", paidQty: 1, totalPriceMinor: 1000 }).returning();
  const [a] = await db.insert(addons).values({ productId: p!.id, name: "X", sku: "X" }).returning();
  const [ao] = await db.insert(addonOptions).values({ addonId: a!.id, qty: 1, priceMinor: 1, label: "1" }).returning();
  return { offerId: o!.id, addonOptionId: ao!.id };
}

describe("createOrder", () => {
  beforeEach(resetDb);

  it("creates order with server-side price and gift line", async () => {
    const s = await seedBasic();
    const r = await createOrder("poset.localhost", body(s), meta);
    expect(r.ok).toBe(true);
    const [o] = await db.select().from(orders);
    expect(o).toMatchObject({ status: "yeni", paymentStatus: "tahsil_bekliyor", phone: "905321234567", city: "İSTANBUL", district: "KADIKÖY", grandTotalMinor: 69900, siteId: s.siteId });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o!.id));
    expect(items.map((i) => i.lineType).sort()).toEqual(["addon", "gift", "paid"]);
    expect(items.find((i) => i.lineType === "gift")).toMatchObject({ qty: 1, isFree: true, lineTotalMinor: 0 });
    const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, o!.id));
    expect(events.map((e) => e.type)).toEqual(["created"]);
    expect(o!.orderNo).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
    expect(o!.publicToken).toMatch(/^[0-9a-f]{32}$/);
  });

  it("ignores any price sent by the client", async () => {
    const s = await seedBasic();
    await createOrder("poset.localhost", body(s, { grandTotalMinor: 1, totalPriceMinor: 1 }), meta);
    const [o] = await db.select().from(orders);
    expect(o!.grandTotalMinor).toBe(69900);
  });

  it("applies site price override", async () => {
    const s = await seedBasic();
    await db.update(sites).set({ priceOverrides: { "3al2": 54900 } }).where(eq(sites.id, s.siteId));
    await createOrder("poset.localhost", body(s, { addonOptionIds: [], expectedGrandTotalMinor: 54900 }), meta);
    const [o] = await db.select().from(orders);
    expect(o!.grandTotalMinor).toBe(54900);
  });

  it("same idempotency key returns same order", async () => {
    const s = await seedBasic();
    const b = body(s);
    const [a, c] = await Promise.all([createOrder("poset.localhost", b, meta), createOrder("poset.localhost", b, meta)]);
    expect(a).toEqual(c);
    expect(await db.select().from(orders)).toHaveLength(1);
  });

  it("idempotency key is scoped to the site", async () => {
    const s = await seedBasic();
    const [site] = await db.select().from(sites).where(eq(sites.id, s.siteId));
    await db.insert(sites).values({ domainId: site!.domainId, subdomain: "mt", productId: s.productId, status: "yayinda" });
    const b = body(s);
    const a = await createOrder("poset.localhost", b, meta);
    const c = await createOrder("mt.localhost", b, meta);
    expect(a.ok).toBe(true);
    expect(c).toMatchObject({ ok: false, code: "validation" });
  });

  it("rejects archived offer with offer_changed", async () => {
    const s = await seedBasic();
    await db.update(offers).set({ archivedAt: new Date() }).where(eq(offers.id, s.offerIds.threeForTwo));
    expect(await createOrder("poset.localhost", body(s), meta)).toEqual({ ok: false, code: "offer_changed" });
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("rejects stale offer version with offer_changed", async () => {
    const s = await seedBasic();
    expect(await createOrder("poset.localhost", body(s, { offerVersion: 2 }), meta)).toEqual({ ok: false, code: "offer_changed" });
  });

  it("rejects offer from another product", async () => {
    const s = await seedBasic();
    const other = await otherProduct();
    expect(await createOrder("poset.localhost", body(s, { offerId: other.offerId }), meta)).toEqual({ ok: false, code: "offer_changed" });
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("rejects addon from another product", async () => {
    const s = await seedBasic();
    const other = await otherProduct();
    const r = await createOrder("poset.localhost", body(s, { addonOptionIds: [other.addonOptionId] }), meta);
    expect(r).toEqual({ ok: false, code: "offer_changed" });
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("treats an addon archived while the page was open as a price change", async () => {
    const s = await seedBasic();
    await db.update(addons).set({ archivedAt: new Date() }).where(eq(addons.id, s.addonId));
    expect(await createOrder("poset.localhost", body(s), meta)).toEqual({ ok: false, code: "offer_changed" });
  });

  it("rejects when the total the customer saw differs from the server total", async () => {
    const s = await seedBasic();
    await db.update(sites).set({ priceOverrides: { "3al2": 79900 } }).where(eq(sites.id, s.siteId));
    expect(await createOrder("poset.localhost", body(s), meta)).toEqual({ ok: false, code: "offer_changed" });
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("requires the expected total", async () => {
    const s = await seedBasic();
    expect(await createOrder("poset.localhost", body(s, { expectedGrandTotalMinor: undefined }), meta)).toMatchObject({ ok: false, code: "validation" });
  });

  it("accepts dotless/ASCII city spellings and stores the canonical name", async () => {
    const s = await seedBasic();
    const r = await createOrder("poset.localhost", body(s, { city: "Istanbul", district: "Kadikoy" }), meta);
    expect(r.ok).toBe(true);
    const [o] = await db.select().from(orders);
    expect(o).toMatchObject({ city: "İSTANBUL", district: "KADIKÖY" });
  });

  it("stops selling when the product is archived", async () => {
    const s = await seedBasic();
    await db.update(products).set({ status: "arsiv" }).where(eq(products.id, s.productId));
    expect(await createOrder("poset.localhost", body(s), meta)).toEqual({ ok: false, code: "not_found" });
  });

  it("rejects two options of the same addon", async () => {
    const s = await seedBasic();
    const r = await createOrder("poset.localhost", body(s, { addonOptionIds: [s.addonOptionIds.one, s.addonOptionIds.two] }), meta);
    expect(r).toMatchObject({ ok: false, code: "validation" });
  });

  it("rejects invalid phone and district with field errors", async () => {
    const s = await seedBasic();
    const r = await createOrder("poset.localhost", body(s, { phone: "1234", district: "ÇANKAYA" }), meta);
    expect(r.ok).toBe(false);
    if (r.ok || r.code !== "validation") throw new Error("expected validation");
    expect(r.fieldErrors.phone).toBeTruthy();
    expect(r.fieldErrors.district).toBeTruthy();
  });

  it("reports phone and district errors together with schema errors", async () => {
    const s = await seedBasic();
    const r = await createOrder("poset.localhost", body(s, { phone: "1234", district: "ÇANKAYA", address: "Kısa" }), meta);
    if (r.ok || r.code !== "validation") throw new Error("expected validation");
    expect(Object.keys(r.fieldErrors).sort()).toEqual(["address", "district", "phone"]);
  });

  it("requires policy acceptance", async () => {
    const s = await seedBasic();
    expect(await createOrder("poset.localhost", body(s, { policyAccepted: false }), meta)).toMatchObject({ ok: false, code: "validation" });
  });

  it("honeypot filled creates nothing", async () => {
    const s = await seedBasic();
    expect(await createOrder("poset.localhost", body(s, { website: "x" }), meta)).toEqual({ ok: false, code: "spam" });
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("unknown or closed site returns not_found", async () => {
    const s = await seedBasic();
    expect(await createOrder("yok.localhost", body(s), meta)).toEqual({ ok: false, code: "not_found" });
    await db.update(sites).set({ status: "kapali" }).where(eq(sites.id, s.siteId));
    expect(await createOrder("poset.localhost", body(s), meta)).toEqual({ ok: false, code: "not_found" });
  });

  it("rejects online payment in this phase", async () => {
    const s = await seedBasic();
    expect(await createOrder("poset.localhost", body(s, { paymentMethod: "online" }), meta)).toMatchObject({ ok: false, code: "validation" });
  });

  it("rejects malformed body", async () => {
    await seedBasic();
    expect(await createOrder("poset.localhost", null, meta)).toMatchObject({ ok: false, code: "validation" });
  });
});
