import { beforeEach, describe, it, expect, vi } from "vitest";
import { resetDb, seedBasic } from "../helpers/db";

vi.mock("@/auth/guard", () => ({ requireUser: async () => ({ id: "u", email: "a@a", role: "admin" }) }));
const { saveOffer } = await import("@/admin/offers/actions");
const { listActiveOffers } = await import("@/admin/offers/store");

const input = (o: Partial<Parameters<typeof saveOffer>[1]> = {}) => ({
  slotKey: "two", label: "2 Adet", paidQty: 2, freeQty: 0, totalPriceMinor: 64900, freeShipping: true,
  sortOrder: 2, isDefault: true, badge: null, ...o,
});

describe("saveOffer", () => {
  beforeEach(resetDb);
  it("editing creates a new version and archives the old one", async () => {
    const s = await seedBasic();
    const v2 = await saveOffer(s.productId, input());
    expect(v2.version).toBe(2);
    const active = await listActiveOffers(s.productId);
    expect(active.filter((o) => o.slotKey === "two")).toHaveLength(1);
    expect(active.find((o) => o.slotKey === "two")!.totalPriceMinor).toBe(64900);
  });
  it("only one default offer per product", async () => {
    const s = await seedBasic();
    await saveOffer(s.productId, input({ slotKey: "one", label: "1 Adet", paidQty: 1, totalPriceMinor: 39900, freeShipping: false, sortOrder: 1 }));
    const active = await listActiveOffers(s.productId);
    expect(active.filter((o) => o.isDefault)).toHaveLength(1);
    expect(active.find((o) => o.isDefault)!.slotKey).toBe("one");
  });
  it("concurrent first saves of a new slot both succeed with distinct versions", async () => {
    const s = await seedBasic();
    const n = input({ slotKey: "5li", isDefault: false });
    const [a, b] = await Promise.all([saveOffer(s.productId, n), saveOffer(s.productId, n)]);
    expect([a.version, b.version].sort()).toEqual([1, 2]);
    expect((await listActiveOffers(s.productId)).filter((o) => o.slotKey === "5li")).toHaveLength(1);
  });

  it("rejects paidQty < 1 and negative price", async () => {
    const s = await seedBasic();
    await expect(saveOffer(s.productId, input({ slotKey: "x", paidQty: 0 }))).rejects.toThrow();
    await expect(saveOffer(s.productId, input({ slotKey: "x", totalPriceMinor: -1 }))).rejects.toThrow();
  });
});
