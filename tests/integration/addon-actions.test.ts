import { beforeEach, describe, it, expect, vi } from "vitest";
import { resetDb, seedBasic } from "../helpers/db";

vi.mock("@/auth/guard", () => ({ requireUser: async () => ({ id: "u", email: "a@a", role: "admin" }) }));
const invalidated = vi.hoisted(() => [] as string[]);
vi.mock("@/lib/cache", () => ({ invalidateTags: (...t: string[]) => invalidated.push(...t), invalidatePath: () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
const { saveAddonOption } = await import("@/admin/addons/actions");

describe("saveAddonOption", () => {
  beforeEach(async () => { await resetDb(); invalidated.length = 0; });
  it("invalidates the add-on's real product, not the one in the form", async () => {
    const s = await seedBasic();
    const fd = new FormData();
    for (const [k, v] of Object.entries({ productId: "999", addonId: String(s.addonId), label: "3 Adet", qty: "3", price: "250" })) fd.set(k, v);
    expect(await saveAddonOption(null, fd)).toMatchObject({ ok: true });
    expect(invalidated).toEqual([`product:${s.productId}`]);
  });
  it("rejects an unknown add-on", async () => {
    await seedBasic();
    const fd = new FormData();
    for (const [k, v] of Object.entries({ productId: "1", addonId: "999", label: "x", qty: "1", price: "1" })) fd.set(k, v);
    expect(await saveAddonOption(null, fd)).toMatchObject({ ok: false });
  });
});
