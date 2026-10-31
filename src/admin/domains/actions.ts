"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invalidateTags } from "@/lib/cache";
import { z } from "zod";
import { requireUser } from "@/auth/guard";
import { db } from "@/db/client";
import { domains } from "@/db/schema";
import { BusinessInfoSchema, DomainNameSchema, zodFieldErrors, type ActionResult } from "@/admin/validation";

export async function createDomain(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser("admin");
  const parsed = DomainNameSchema.safeParse(fd.get("name"));
  if (!parsed.success) return { ok: false, fieldErrors: { name: parsed.error.issues[0]!.message } };
  const existing = await db.select().from(domains).where(eq(domains.name, parsed.data));
  if (existing.length) return { ok: false, fieldErrors: { name: "Bu alan adı zaten ekli." } };
  await db.insert(domains).values({ name: parsed.data });
  revalidatePath("/admin/domains");
  return { ok: true, message: "Alan adı eklendi." };
}

const UpdateDomainSchema = z.object({
  id: z.coerce.number().int(),
  active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  useOwnBusinessInfo: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  businessInfo: BusinessInfoSchema,
});

export async function updateDomain(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireUser("admin");
  const parsed = UpdateDomainSchema.safeParse({
    id: fd.get("id"), active: fd.get("active"), useOwnBusinessInfo: fd.get("useOwnBusinessInfo"),
    businessInfo: Object.fromEntries(["legalName", "taxNo", "taxOffice", "address", "phone", "email"].map((k) => [k, fd.get(k) ?? ""])),
  });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const { id, active, useOwnBusinessInfo, businessInfo } = parsed.data;
  await db.update(domains).set({ active, businessInfo: useOwnBusinessInfo ? businessInfo : null }).where(eq(domains.id, id));
  invalidateTags(`domain:${id}`);
  revalidatePath("/admin/domains");
  return { ok: true, message: "Kaydedildi." };
}
