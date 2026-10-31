import { beforeEach, describe, it, expect } from "vitest";
import { db } from "@/db/client";
import { domains, sites } from "@/db/schema";
import { resetDb, seedBasic } from "../helpers/db";

describe("schema", () => {
  beforeEach(resetDb);
  it("rejects duplicate subdomain on same domain", async () => {
    const s = await seedBasic();
    await expect(
      db.insert(sites).values({ domainId: s.domainId, subdomain: "poset", productId: s.productId, status: "yayinda", theme: {}, contentOverrides: {}, priceOverrides: {} }),
    ).rejects.toThrow();
  });
  it("allows same subdomain on different domain", async () => {
    const s = await seedBasic();
    const [d2] = await db.insert(domains).values({ name: "ornek.com" }).returning();
    await db.insert(sites).values({ domainId: d2!.id, subdomain: "poset", productId: s.productId, status: "yayinda", theme: {}, contentOverrides: {}, priceOverrides: {} });
  });
});
