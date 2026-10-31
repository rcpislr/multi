import { beforeEach, describe, it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sites } from "@/db/schema";
import { resetDb, seedBasic } from "../helpers/db";

vi.mock("@/auth/guard", () => ({ requireUser: async () => ({ id: "u", email: "a@a", role: "admin" }) }));
const { createSite, updateSite, updateSiteForm } = await import("@/admin/sites/actions");

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
  it("saving the site form keeps array overrides set elsewhere", async () => {
    const s = await seedBasic();
    await updateSite(s.siteId, { contentOverrides: { faq: [{ q: "Siteye özel?", a: "Evet" }] } });
    const fd = new FormData();
    for (const [k, v] of Object.entries({ id: String(s.siteId), status: "yayinda", heroTitle: "Yeni başlık" })) fd.set(k, v);
    expect(await updateSiteForm(null, fd)).toMatchObject({ ok: true });
    const [site] = await db.select().from(sites).where(eq(sites.id, s.siteId));
    expect(site!.contentOverrides).toEqual({ faq: [{ q: "Siteye özel?", a: "Evet" }], hero: { title: "Yeni başlık" } });
  });

  it("rejects invalid content override", async () => {
    const s = await seedBasic();
    await expect(updateSite(s.siteId, { contentOverrides: { theme: { primaryColor: "red" } } })).rejects.toThrow();
  });
});
