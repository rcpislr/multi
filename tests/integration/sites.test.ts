import { beforeEach, describe, it, expect, vi } from "vitest";
import { resetDb, seedBasic } from "../helpers/db";

vi.mock("@/auth/guard", () => ({ requireUser: async () => ({ id: "u", email: "a@a", role: "admin" }) }));
const { createSite, updateSite } = await import("@/admin/sites/actions");

describe("sites", () => {
  beforeEach(resetDb);
  it("creates draft site", async () => {
    const s = await seedBasic();
    const site = await createSite({ domainId: s.domainId, subdomain: "mt", productId: s.productId });
    expect(site.status).toBe("taslak");
  });
  it("rejects duplicate subdomain on same domain with a readable error", async () => {
    const s = await seedBasic();
    await expect(createSite({ domainId: s.domainId, subdomain: "poset", productId: s.productId })).rejects.toThrow("Bu adres zaten kullanılıyor");
  });
  it("rejects reserved subdomain", async () => {
    const s = await seedBasic();
    await expect(createSite({ domainId: s.domainId, subdomain: "panel", productId: s.productId })).rejects.toThrow();
  });
  it("requires redirectUrl for yonlendir", async () => {
    const s = await seedBasic();
    await expect(updateSite(s.siteId, { status: "yonlendir" })).rejects.toThrow();
    const site = await updateSite(s.siteId, { status: "yonlendir", redirectUrl: "https://x.com" });
    expect(site.redirectUrl).toBe("https://x.com");
  });
  it("rejects price override for unknown slot", async () => {
    const s = await seedBasic();
    await expect(updateSite(s.siteId, { priceOverrides: { yok: 100 } })).rejects.toThrow();
    const site = await updateSite(s.siteId, { priceOverrides: { two: 54900 } });
    expect(site.priceOverrides).toEqual({ two: 54900 });
  });
  it("rejects invalid content override", async () => {
    const s = await seedBasic();
    await expect(updateSite(s.siteId, { contentOverrides: { theme: { primaryColor: "red" } } })).rejects.toThrow();
  });
});
