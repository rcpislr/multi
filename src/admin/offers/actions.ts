"use server";
import { eq } from "drizzle-orm";
import { requireUser } from "@/auth/guard";
import { db } from "@/db/client";
import { offers, type Offer } from "@/db/schema";
import { invalidateTags } from "@/lib/cache";
import { archiveOfferById, saveOfferVersion, type OfferInput } from "./store";

export async function saveOffer(productId: number, input: OfferInput): Promise<Offer> {
  await requireUser("admin");
  const offer = await saveOfferVersion(productId, input);
  invalidateTags(`product:${productId}`);
  return offer;
}

export async function archiveOffer(offerId: number): Promise<void> {
  await requireUser("admin");
  const [o] = await db.select().from(offers).where(eq(offers.id, offerId));
  if (!o) return;
  await archiveOfferById(offerId);
  invalidateTags(`product:${o.productId}`);
}

import { revalidatePath } from "next/cache";
import { fdBool, fdInt, fdMoney, fdStr } from "@/admin/form-data";
import { zodFieldErrors, type ActionResult } from "@/admin/validation";
import { OfferInputSchema } from "./store";

export async function saveOfferForm(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser("admin");
  const productId = fdInt(fd, "productId");
  const parsed = OfferInputSchema.safeParse({
    slotKey: fdStr(fd, "slotKey"), label: fdStr(fd, "label"), badge: fdStr(fd, "badge") || null,
    paidQty: fdInt(fd, "paidQty"), freeQty: fdInt(fd, "freeQty") || 0, totalPriceMinor: fdMoney(fd, "totalPrice"),
    freeShipping: fdBool(fd, "freeShipping"), sortOrder: fdInt(fd, "sortOrder") || 0, isDefault: fdBool(fd, "isDefault"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  await saveOffer(productId, parsed.data);
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, message: "Paket kaydedildi (yeni sürüm)." };
}

export async function archiveOfferForm(fd: FormData): Promise<void> {
  await archiveOffer(fdInt(fd, "offerId"));
  revalidatePath(`/admin/products/${fdInt(fd, "productId")}`);
}
