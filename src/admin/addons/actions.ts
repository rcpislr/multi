"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth/guard";
import { invalidateTags } from "@/lib/cache";
import { fdInt, fdMoney, fdStr } from "@/admin/form-data";
import { zodFieldErrors, type ActionResult } from "@/admin/validation";
import { AddonInputSchema, AddonOptionInputSchema, archiveAddonById, upsertAddon, upsertAddonOption } from "./store";

function done(productId: number, message: string): ActionResult {
  invalidateTags(`product:${productId}`);
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, message };
}

export async function saveAddon(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser("admin");
  const productId = fdInt(fd, "productId");
  const parsed = AddonInputSchema.safeParse({ name: fdStr(fd, "name"), sku: fdStr(fd, "sku"), vatRate: fdInt(fd, "vatRate"), description: fdStr(fd, "description") });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  await upsertAddon(productId, fdInt(fd, "id") || null, parsed.data);
  return done(productId, "Ek ürün kaydedildi.");
}

export async function saveAddonOption(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser("admin");
  const productId = fdInt(fd, "productId");
  const parsed = AddonOptionInputSchema.safeParse({ qty: fdInt(fd, "qty"), priceMinor: fdMoney(fd, "price"), label: fdStr(fd, "label"), sortOrder: fdInt(fd, "sortOrder") || 0 });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  await upsertAddonOption(fdInt(fd, "addonId"), fdInt(fd, "id") || null, parsed.data);
  return done(productId, "Seçenek kaydedildi.");
}

export async function archiveAddon(fd: FormData): Promise<void> {
  await requireUser("admin");
  await archiveAddonById(fdInt(fd, "addonId"));
  done(fdInt(fd, "productId"), "");
}
