import { beforeEach, describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { domains, sites } from "@/db/schema";
import { resetDb, seedBasic } from "../helpers/db";
import { resolveSite } from "@/tenancy/resolve-site";

describe("resolveSite", () => {
  beforeEach(resetDb);
  it("resolves published site", async () => {
    await seedBasic();
    const r = await resolveSite("poset.localhost");
    expect(r?.site.subdomain).toBe("poset");
    expect(r?.domain.name).toBe("localhost");
    expect(r?.product.name).toBe("Mini Poşet Kapatıcı");
  });
  it("returns null for unknown subdomain", async () => {
    await seedBasic();
    expect(await resolveSite("yok.localhost")).toBeNull();
  });
  it("returns null for bare domain", async () => {
    await seedBasic();
    expect(await resolveSite("localhost")).toBeNull();
  });
  it("returns null for closed site", async () => {
    const s = await seedBasic();
    await db.update(sites).set({ status: "kapali" }).where(eq(sites.id, s.siteId));
    expect(await resolveSite("poset.localhost")).toBeNull();
  });
  it("returns null for draft unless allowDraft", async () => {
    const s = await seedBasic();
    await db.update(sites).set({ status: "taslak" }).where(eq(sites.id, s.siteId));
    expect(await resolveSite("poset.localhost")).toBeNull();
    expect((await resolveSite("poset.localhost", { allowDraft: true }))?.site.id).toBe(s.siteId);
  });
  it("returns redirect site", async () => {
    const s = await seedBasic();
    await db.update(sites).set({ status: "yonlendir", redirectUrl: "https://ornek.com" }).where(eq(sites.id, s.siteId));
    expect((await resolveSite("poset.localhost"))?.site.redirectUrl).toBe("https://ornek.com");
  });
  it("returns null for inactive domain", async () => {
    const s = await seedBasic();
    await db.update(domains).set({ active: false }).where(eq(domains.id, s.domainId));
    expect(await resolveSite("poset.localhost")).toBeNull();
  });
  it("picks longest matching domain", async () => {
    const s = await seedBasic();
    const [d2] = await db.insert(domains).values({ name: "a.localhost" }).returning();
    await db.insert(sites).values({ domainId: d2!.id, subdomain: "x", productId: s.productId, status: "yayinda" });
    const r = await resolveSite("x.a.localhost");
    expect(r?.domain.name).toBe("a.localhost");
    expect(r?.site.subdomain).toBe("x");
  });
});
