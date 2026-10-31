import { and, asc, eq, isNull, max, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { offers, type Offer } from "@/db/schema";

export const OfferInputSchema = z.object({
  slotKey: z.string().trim().regex(/^[a-z0-9-]{1,30}$/, "Paket anahtarı küçük harf, rakam ve tire olmalı."),
  label: z.string().trim().min(1, "Etiket gerekli.").max(60),
  badge: z.string().trim().max(40).nullable(),
  paidQty: z.number().int().min(1, "Ücretli adet en az 1 olmalı.").max(50),
  freeQty: z.number().int().min(0).max(50),
  totalPriceMinor: z.number().int().min(0, "Fiyat negatif olamaz."),
  freeShipping: z.boolean(),
  sortOrder: z.number().int(),
  isDefault: z.boolean(),
});
export type OfferInput = z.infer<typeof OfferInputSchema>;

export async function listActiveOffers(productId: number): Promise<Offer[]> {
  return db.select().from(offers)
    .where(and(eq(offers.productId, productId), isNull(offers.archivedAt)))
    .orderBy(asc(offers.sortOrder), asc(offers.id));
}

/** Editing an offer never mutates it: the active version is archived and a new version is inserted. */
export async function saveOfferVersion(productId: number, raw: OfferInput): Promise<Offer> {
  const input = OfferInputSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(offers)
      .where(and(eq(offers.productId, productId), eq(offers.slotKey, input.slotKey), isNull(offers.archivedAt)))
      .for("update");
    const [latest] = await tx.select({ v: max(offers.version) }).from(offers)
      .where(and(eq(offers.productId, productId), eq(offers.slotKey, input.slotKey)));
    if (current) await tx.update(offers).set({ archivedAt: new Date() }).where(eq(offers.id, current.id));
    const [created] = await tx.insert(offers).values({ productId, ...input, version: (latest?.v ?? 0) + 1 }).returning();
    if (input.isDefault) {
      await tx.update(offers).set({ isDefault: false })
        .where(and(eq(offers.productId, productId), isNull(offers.archivedAt), ne(offers.id, created!.id)));
    }
    return created!;
  });
}

export async function archiveOfferById(offerId: number): Promise<void> {
  await db.update(offers).set({ archivedAt: new Date() }).where(and(eq(offers.id, offerId), isNull(offers.archivedAt)));
}
