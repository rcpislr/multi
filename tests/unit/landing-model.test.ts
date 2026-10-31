import { describe, it, expect } from "vitest";
import { buildLandingModel, type BuildLandingInput } from "@/landing/model";
import { emptyProductContent } from "@/content/schema";

function input(over: Partial<BuildLandingInput> = {}): BuildLandingInput {
  const content = emptyProductContent();
  content.hero = { title: "Ürün", subtitle: "Ürün alt başlık", ctaLabel: "Al" };
  content.faq = [{ q: "x", a: "y" }, { q: "z", a: "w" }];
  const offer = (id: number, slotKey: string, price: number, extra = {}) => ({
    id, productId: 1, slotKey, version: 1, label: slotKey, badge: null, paidQty: 1, freeQty: 0,
    totalPriceMinor: price, freeShipping: false, sortOrder: id, isDefault: slotKey === "two", archivedAt: null, ...extra,
  });
  return {
    site: { id: 7, subdomain: "poset", productId: 1, priceOverrides: {}, contentOverrides: {} },
    domain: { name: "localhost", businessInfo: null },
    product: { name: "Ürün", sku: "S", vatRate: 20, unitPriceMinor: 39900, codFeeEnabled: false, codFeeCashMinor: 0, codFeeCardMinor: 0, content },
    offers: [offer(1, "one", 39900), offer(2, "two", 59900), offer(3, "old", 1, { archivedAt: new Date() })],
    addons: [],
    settings: { businessInfo: { legalName: "Global A.Ş." }, shippingFeeMinor: 4990, freeShippingThresholdMinor: null, shippingVatRate: 20 },
    ...over,
  };
}

describe("buildLandingModel", () => {
  it("applies site price override to offer", () => {
    const m = buildLandingModel(input({ site: { ...input().site, priceOverrides: { two: 54900 } } }));
    expect(m.offers.find((o) => o.slotKey === "two")!.priceMinor).toBe(54900);
    expect(m.offers.find((o) => o.slotKey === "one")!.priceMinor).toBe(39900);
  });
  it("overrides hero title but keeps hero subtitle", () => {
    const m = buildLandingModel(input({ site: { ...input().site, contentOverrides: { hero: { title: "Yeni" } } } }));
    expect(m.content.hero.title).toBe("Yeni");
    expect(m.content.hero.subtitle).toBe("Ürün alt başlık");
  });
  it("replaces arrays wholesale", () => {
    const m = buildLandingModel(input({ site: { ...input().site, contentOverrides: { faq: [{ q: "a", a: "b" }] } } }));
    expect(m.content.faq).toHaveLength(1);
  });
  it("uses domain business info when present, else settings", () => {
    expect(buildLandingModel(input()).business.legalName).toBe("Global A.Ş.");
    expect(buildLandingModel(input({ domain: { name: "localhost", businessInfo: { legalName: "Domain Ltd." } } })).business.legalName).toBe("Domain Ltd.");
  });
  it("excludes archived offers", () => {
    expect(buildLandingModel(input()).offers.map((o) => o.slotKey)).toEqual(["one", "two"]);
  });
  it("exposes quote inputs", () => {
    const m = buildLandingModel(input());
    expect(m.shipping).toEqual({ feeMinor: 4990, freeThresholdMinor: null, vatRate: 20 });
    expect(m.product.unitPriceMinor).toBe(39900);
    expect(m.host).toBe("poset.localhost");
  });
});
