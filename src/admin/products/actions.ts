"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/guard";
import { invalidateTags } from "@/lib/cache";
import { fdBool, fdInt, fdMoney, fdStr } from "@/admin/form-data";
import { zodFieldErrors, type ActionResult } from "@/admin/validation";
import { ProductContentSchema } from "@/content/schema";
import { ProductGeneralSchema, insertProduct, updateProductContentById, updateProductGeneralById } from "./store";

export async function createProduct(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser("admin");
  const parsed = ProductGeneralSchema.pick({ name: true, sku: true, unitPriceMinor: true, vatRate: true }).safeParse({
    name: fdStr(fd, "name"), sku: fdStr(fd, "sku"), unitPriceMinor: fdMoney(fd, "unitPrice"), vatRate: fdInt(fd, "vatRate"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const p = await insertProduct(parsed.data);
  redirect(`/admin/products/${p.id}`);
}

export async function updateProductGeneral(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser("admin");
  const id = fdInt(fd, "id");
  const parsed = ProductGeneralSchema.safeParse({
    name: fdStr(fd, "name"), sku: fdStr(fd, "sku"), vatRate: fdInt(fd, "vatRate"),
    costMinor: fdMoney(fd, "cost"), unitPriceMinor: fdMoney(fd, "unitPrice"),
    trackStock: fdBool(fd, "trackStock"), stockQty: fdInt(fd, "stockQty"),
    codFeeEnabled: fdBool(fd, "codFeeEnabled"), codFeeCashMinor: fdMoney(fd, "codFeeCash"), codFeeCardMinor: fdMoney(fd, "codFeeCard"),
    status: fdStr(fd, "status"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  await updateProductGeneralById(id, parsed.data);
  invalidateTags(`product:${id}`);
  revalidatePath(`/admin/products/${id}`);
  return { ok: true, message: "Ürün kaydedildi." };
}

export async function updateProductContent(productId: number, content: z.input<typeof ProductContentSchema>): Promise<ActionResult> {
  await requireUser("admin");
  const parsed = ProductContentSchema.safeParse(content);
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  await updateProductContentById(productId, parsed.data);
  invalidateTags(`product:${productId}`);
  return { ok: true, message: "İçerik kaydedildi." };
}
