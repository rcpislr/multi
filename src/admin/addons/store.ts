import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { addonOptions, addons, type Addon, type AddonOption } from "@/db/schema";

export const AddonInputSchema = z.object({
  name: z.string().trim().min(1, "Ad gerekli.").max(120),
  sku: z.string().trim().min(1, "SKU gerekli.").max(60),
  vatRate: z.number().int().min(0).max(100),
  description: z.string().trim().max(500),
});
export const AddonOptionInputSchema = z.object({
  qty: z.number().int().min(1, "Adet en az 1 olmalı.").max(50),
  priceMinor: z.number().int().min(0, "Fiyat negatif olamaz."),
  label: z.string().trim().min(1, "Etiket gerekli.").max(60),
  sortOrder: z.number().int(),
});

export type AddonWithOptions = Addon & { options: AddonOption[] };

export async function listActiveAddons(productId: number): Promise<AddonWithOptions[]> {
  const rows = await db.select().from(addons)
    .where(and(eq(addons.productId, productId), isNull(addons.archivedAt))).orderBy(asc(addons.id));
  if (!rows.length) return [];
  const opts = await db.select().from(addonOptions)
    .where(inArray(addonOptions.addonId, rows.map((r) => r.id)))
    .orderBy(asc(addonOptions.sortOrder), asc(addonOptions.id));
  return rows.map((r) => ({ ...r, options: opts.filter((o) => o.addonId === r.id) }));
}

export async function upsertAddon(productId: number, id: number | null, raw: z.input<typeof AddonInputSchema>): Promise<Addon> {
  const input = AddonInputSchema.parse(raw);
  if (id) {
    const [row] = await db.update(addons).set(input).where(and(eq(addons.id, id), eq(addons.productId, productId))).returning();
    if (!row) throw new Error("Ek ürün bulunamadı.");
    return row;
  }
  const [row] = await db.insert(addons).values({ productId, ...input }).returning();
  return row!;
}

export async function getAddonProductId(addonId: number): Promise<number | null> {
  const [a] = await db.select({ productId: addons.productId }).from(addons).where(eq(addons.id, addonId));
  return a?.productId ?? null;
}

export async function upsertAddonOption(addonId: number, id: number | null, raw: z.input<typeof AddonOptionInputSchema>): Promise<AddonOption> {
  const input = AddonOptionInputSchema.parse(raw);
  if (id) {
    const [row] = await db.update(addonOptions).set(input).where(and(eq(addonOptions.id, id), eq(addonOptions.addonId, addonId))).returning();
    if (!row) throw new Error("Seçenek bulunamadı.");
    return row;
  }
  const [row] = await db.insert(addonOptions).values({ addonId, ...input }).returning();
  return row!;
}

export async function archiveAddonById(id: number): Promise<void> {
  await db.update(addons).set({ archivedAt: new Date() }).where(eq(addons.id, id));
}
