import { beforeEach, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { domains, orderEvents, orders, sites } from "@/db/schema";
import { resetDb, seedBasic } from "../helpers/db";
import { createOrder } from "@/orders/create-order";

const session = vi.hoisted(() => ({ role: "operator" as "admin" | "operator" }));
vi.mock("@/auth/guard", async (orig) => {
  const real = await orig<typeof import("@/auth/guard")>();
  const user = () => ({ id: "u1", email: "op@test", role: session.role });
  return { ...real, getPanelUser: async () => user(), requireUser: async () => user() };
});
const { changeStatus, editOrder } = await import("@/admin/orders/actions");
const { listOrders } = await import("@/admin/orders/queries");
const { GET: exportCsv } = await import("@/app/admin/(panel)/orders/export/route");

type Seed = Awaited<ReturnType<typeof seedBasic>>;
async function order(s: Seed, host = "poset.localhost", phone = "5321234567", customerName = "Ayşe Yılmaz") {
  const r = await createOrder(host, {
    idempotencyKey: randomUUID(), offerId: s.offerIds.two, offerVersion: 1, addonOptionIds: [],
    customerName, phone, city: "İSTANBUL", district: "KADIKÖY", address: "Moda Mah. Örnek Sok. No 1",
    paymentMethod: "cod_cash", policyAccepted: true, website: "", expectedGrandTotalMinor: 59900,
  }, { ip: "1.1.1.1", userAgent: "t" });
  if (!r.ok) throw new Error(JSON.stringify(r));
  const [o] = await db.select().from(orders).where(eq(orders.orderNo, r.orderNo));
  return o!;
}

describe("order admin", () => {
  beforeEach(async () => { await resetDb(); session.role = "operator"; });

  it("bulk change skips invalid transitions", async () => {
    const s = await seedBasic();
    const a = await order(s);
    const b = await order(s);
    await db.update(orders).set({ status: "kargoda" }).where(eq(orders.id, b.id));
    const r = await changeStatus([a.id, b.id], "onaylandi");
    expect(r.changed).toEqual([a.id]);
    expect(r.skipped.map((x) => x.id)).toEqual([b.id]);
    const ev = await db.select().from(orderEvents).where(eq(orderEvents.type, "status_changed"));
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ orderId: a.id, fromStatus: "yeni", toStatus: "onaylandi", actorUserId: "u1" });
  });

  it("operator can edit address", async () => {
    const s = await seedBasic();
    const o = await order(s);
    const updated = await editOrder(o.id, { address: "Yeni adres sokak 12345" });
    expect(updated.address).toBe("Yeni adres sokak 12345");
    const [ev] = await db.select().from(orderEvents).where(eq(orderEvents.type, "edited"));
    expect(ev!.diff).toMatchObject({ address: { from: "Moda Mah. Örnek Sok. No 1", to: "Yeni adres sokak 12345" } });
  });

  it("operator cannot edit price or offer", async () => {
    const s = await seedBasic();
    const o = await order(s);
    await expect(editOrder(o.id, { grandTotalMinor: 1 })).rejects.toThrow();
    await expect(editOrder(o.id, { offerId: 2 })).rejects.toThrow();
    const [after] = await db.select().from(orders).where(eq(orders.id, o.id));
    expect(after!.grandTotalMinor).toBe(o.grandTotalMinor);
  });

  it("operator edit accepts ASCII spellings and stores canonical names", async () => {
    const s = await seedBasic();
    const o = await order(s);
    const updated = await editOrder(o.id, { city: "Istanbul", district: "Besiktas" });
    expect(updated).toMatchObject({ city: "İSTANBUL", district: "BEŞİKTAŞ" });
  });

  it("export neutralizes spreadsheet formulas", async () => {
    const s = await seedBasic();
    await order(s, "poset.localhost", "5321234567", '=HYPERLINK("http://x","y")');
    session.role = "admin";
    const text = await (await exportCsv(new Request("http://panel.localhost/admin/orders/export"))).text();
    expect(text).toContain(`"'=HYPERLINK(""http://x"",""y"")"`);
    expect(text).not.toMatch(/;=HYPERLINK/);
  });

  it("edit validates city/district", async () => {
    const s = await seedBasic();
    const o = await order(s);
    await expect(editOrder(o.id, { city: "ANKARA", district: "KADIKÖY" })).rejects.toThrow();
  });

  it("listOrders filters by site and searches phone", async () => {
    const s = await seedBasic();
    const [d] = await db.select().from(domains);
    const [site2] = await db.insert(sites).values({ domainId: d!.id, subdomain: "mt", productId: s.productId, status: "yayinda" }).returning();
    await order(s, "poset.localhost", "5321234567");
    await order(s, "mt.localhost", "5559876543");
    const bySite = await listOrders({ siteId: site2!.id, page: 1, pageSize: 20 });
    expect(bySite.total).toBe(1);
    expect(bySite.rows[0]!.siteHost).toBe("mt.localhost");
    const byPhone = await listOrders({ q: "0532 123 45 67", page: 1, pageSize: 20 });
    expect(byPhone.total).toBe(1);
    expect(byPhone.rows[0]!.phone).toBe("905321234567");
  });

  it("export is forbidden for operator", async () => {
    await seedBasic();
    const res = await exportCsv(new Request("http://panel.localhost/admin/orders/export"));
    expect(res.status).toBe(403);
  });

  it("export returns csv for admin", async () => {
    const s = await seedBasic();
    const o = await order(s);
    session.role = "admin";
    const res = await exportCsv(new Request("http://panel.localhost/admin/orders/export"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain(o.orderNo);
    expect(text).toContain("599,00");
  });
});
