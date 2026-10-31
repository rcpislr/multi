"use server";
import { revalidatePath } from "next/cache";
import { invalidateTags } from "@/lib/cache";
import { z } from "zod";
import { requireUser } from "@/auth/guard";
import { BusinessInfoSchema, MoneyInput, zodFieldErrors, type ActionResult } from "@/admin/validation";
import { updateSettings } from "./store";

const SettingsSchema = z.object({
  businessInfo: BusinessInfoSchema,
  shippingFeeMinor: MoneyInput,
  freeShippingThresholdMinor: z.union([z.literal("").transform(() => null), MoneyInput]),
  shippingVatRate: z.coerce.number().int().min(0).max(100),
  cookieBannerEnabled: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveSettings(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser("admin");
  const parsed = SettingsSchema.safeParse({
    businessInfo: Object.fromEntries(["legalName", "taxNo", "taxOffice", "address", "phone", "email", "mersisNo"].map((k) => [k, fd.get(k) ?? ""])),
    shippingFeeMinor: fd.get("shippingFee") ?? "",
    freeShippingThresholdMinor: String(fd.get("freeShippingThreshold") ?? "").trim(),
    shippingVatRate: fd.get("shippingVatRate"),
    cookieBannerEnabled: fd.get("cookieBannerEnabled"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  await updateSettings(parsed.data);
  invalidateTags("settings");
  revalidatePath("/admin/settings");
  return { ok: true, message: "Ayarlar kaydedildi." };
}
