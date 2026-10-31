import { beforeEach, describe, it, expect } from "vitest";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { resetDb } from "../helpers/db";
import { getSettings, updateSettings } from "@/admin/settings/store";

describe("settings", () => {
  beforeEach(resetDb);
  it("creates defaults on first read", async () => {
    const s = await getSettings();
    expect(s.shippingVatRate).toBe(20);
    expect(s.cookieBannerEnabled).toBe(false);
  });
  it("is a single row", async () => {
    await getSettings();
    await getSettings();
    expect(await db.select().from(settings)).toHaveLength(1);
  });
  it("updates", async () => {
    await updateSettings({ shippingFeeMinor: 5990 });
    expect((await getSettings()).shippingFeeMinor).toBe(5990);
  });
});
