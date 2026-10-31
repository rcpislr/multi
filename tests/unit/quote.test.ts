import { describe, it, expect } from "vitest";
import { quote, type QuoteInput } from "@/pricing/quote";

const base: QuoteInput = {
  product: { name: "Mini Poşet Kapatıcı", sku: "PK1", vatRate: 20, unitPriceMinor: 39900,
             codFeeEnabled: false, codFeeCashMinor: 0, codFeeCardMinor: 0 },
  offer: { id: 1, version: 1, slotKey: "one", paidQty: 1, freeQty: 0, totalPriceMinor: 39900, freeShipping: false },
  priceOverrideMinor: null, addons: [], paymentMethod: "cod_cash",
  shipping: { feeMinor: 4990, freeThresholdMinor: null, vatRate: 20 },
};
const two = { ...base.offer, id: 2, slotKey: "two", paidQty: 2, totalPriceMinor: 59900, freeShipping: true };
const threeForTwo = { ...base.offer, id: 3, slotKey: "3for2", paidQty: 2, freeQty: 1, totalPriceMinor: 59900, freeShipping: true };
const brush = { optionId: 9, name: "Fırça", sku: "FR1", vatRate: 20, qty: 1, priceMinor: 10000 };

describe("quote", () => {
  it("single unit adds shipping", () => {
    const q = quote(base);
    expect(q.shippingMinor).toBe(4990);
    expect(q.grandTotalMinor).toBe(44890);
    expect(q.lines.map((l) => l.lineType)).toEqual(["paid", "shipping"]);
  });
  it("two pack has free shipping", () => {
    const q = quote({ ...base, offer: two });
    expect(q.grandTotalMinor).toBe(59900);
    expect(q.lines.find((l) => l.lineType === "shipping")).toBeUndefined();
  });
  it("3 for 2 creates a gift line", () => {
    const q = quote({ ...base, offer: threeForTwo });
    const gift = q.lines.find((l) => l.lineType === "gift")!;
    expect(gift).toMatchObject({ qty: 1, unitListPriceMinor: 39900, lineTotalMinor: 0, isFree: true });
    expect(q.discountMinor).toBe(39900);
    expect(q.physicalQty).toBe(3);
    expect(q.grandTotalMinor).toBe(59900);
    expect(q.packageSavingsMinor).toBe(59800);
  });
  it("site price override replaces offer price", () => {
    expect(quote({ ...base, offer: two, priceOverrideMinor: 54900 }).grandTotalMinor).toBe(54900);
  });
  it("threshold counts addons after discount", () => {
    const shipping = { ...base.shipping, freeThresholdMinor: 50000 };
    expect(quote({ ...base, shipping, addons: [brush] }).shippingMinor).toBe(4990);
    expect(quote({ ...base, shipping, addons: [{ ...brush, priceMinor: 20000 }] }).shippingMinor).toBe(0);
  });
  it("cod fee depends on payment method", () => {
    const product = { ...base.product, codFeeEnabled: true, codFeeCashMinor: 1500, codFeeCardMinor: 2500 };
    expect(quote({ ...base, offer: two, product, paymentMethod: "cod_cash" }).codFeeMinor).toBe(1500);
    expect(quote({ ...base, offer: two, product, paymentMethod: "cod_card" }).grandTotalMinor).toBe(62400);
    expect(quote({ ...base, offer: two, product, paymentMethod: "online" }).codFeeMinor).toBe(0);
  });
  it("cod fee disabled adds nothing", () => {
    const product = { ...base.product, codFeeCashMinor: 1500 };
    expect(quote({ ...base, product }).lines.some((l) => l.lineType === "cod_fee")).toBe(false);
  });
  it("vat is included per line", () => {
    expect(quote({ ...base, offer: two }).vatTotalMinor).toBe(9983);
  });
  it("is deterministic and does not mutate input", () => {
    const input = structuredClone({ ...base, addons: [brush] });
    const a = quote(input);
    const b = quote(input);
    expect(a).toEqual(b);
    expect(input).toEqual({ ...base, addons: [brush] });
  });
});
