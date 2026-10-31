"use server";
import { eq, inArray } from "drizzle-orm";
import { invalidatePath as revalidatePath } from "@/lib/cache";
import { z } from "zod";
import { requireUser } from "@/auth/guard";
import { db } from "@/db/client";
import { orderEvents, orders, type Order, type OrderStatus } from "@/db/schema";
import { canonicalCity, canonicalDistrict } from "@/geo/tr";
import { canTransition, ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/orders/status";
import { zodFieldErrors, type ActionResult } from "@/admin/validation";
import { fdInt, fdStr } from "@/admin/form-data";

export async function changeStatus(orderIds: number[], to: OrderStatus): Promise<{ changed: number[]; skipped: Array<{ id: number; reason: string }> }> {
  const user = await requireUser("operator");
  if (!ORDER_STATUSES.includes(to)) throw new Error("Geçersiz durum.");
  const ids = [...new Set(orderIds.map(Number))].filter(Number.isInteger);
  const changed: number[] = [];
  const skipped: Array<{ id: number; reason: string }> = [];
  await db.transaction(async (tx) => {
    const rows = ids.length ? await tx.select({ id: orders.id, status: orders.status }).from(orders).where(inArray(orders.id, ids)).for("update") : [];
    for (const id of ids) {
      const row = rows.find((r) => r.id === id);
      if (!row) { skipped.push({ id, reason: "Sipariş bulunamadı." }); continue; }
      if (!canTransition(row.status, to)) {
        skipped.push({ id, reason: `${ORDER_STATUS_LABELS[row.status]} → ${ORDER_STATUS_LABELS[to]} geçişi yapılamaz.` });
        continue;
      }
      await tx.update(orders).set({ status: to }).where(eq(orders.id, id));
      await tx.insert(orderEvents).values({ orderId: id, type: "status_changed", fromStatus: row.status, toStatus: to, actorUserId: user.id });
      changed.push(id);
    }
  });
  revalidatePath("/admin/orders");
  return { changed, skipped };
}

const EditableSchema = z.object({
  customerName: z.string().trim().min(2, "İsim en az 2 karakter.").max(80),
  city: z.string().trim().min(1),
  district: z.string().trim().min(1),
  address: z.string().trim().min(10, "Adres en az 10 karakter.").max(300),
  internalNote: z.string().trim().max(2000),
}).partial().strict();

export async function editOrder(id: number, patch: unknown): Promise<Order> {
  const user = await requireUser("operator");
  const input = EditableSchema.parse(patch);
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    if (!cur) throw new Error("Sipariş bulunamadı.");
    const next = { ...input };
    if (next.city !== undefined || next.district !== undefined) {
      const city = canonicalCity(next.city ?? cur.city);
      if (!city) throw new Error("Geçerli bir il girin.");
      const district = canonicalDistrict(city, next.district ?? cur.district);
      if (!district) throw new Error("İlçe bu ile ait değil.");
      next.city = city;
      next.district = district;
    }
    const diff: Record<string, { from: string; to: string }> = {};
    for (const [k, v] of Object.entries(next) as Array<[keyof typeof next, string]>) {
      if (cur[k] !== v) diff[k] = { from: cur[k], to: v };
    }
    if (!Object.keys(diff).length) return cur;
    const [updated] = await tx.update(orders).set(next).where(eq(orders.id, id)).returning();
    await tx.insert(orderEvents).values({ orderId: id, type: "edited", diff, actorUserId: user.id });
    return updated!;
  });
}

export async function editOrderForm(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = fdInt(fd, "id");
  try {
    await editOrder(id, {
      customerName: fdStr(fd, "customerName"), city: fdStr(fd, "city"), district: fdStr(fd, "district"),
      address: fdStr(fd, "address"), internalNote: fdStr(fd, "internalNote"),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, fieldErrors: zodFieldErrors(e) };
    return { ok: false, error: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: "Sipariş güncellendi." };
}

export async function changeStatusForm(fd: FormData): Promise<void> {
  await changeStatus([fdInt(fd, "id")], fdStr(fd, "to") as OrderStatus);
  revalidatePath(`/admin/orders/${fdInt(fd, "id")}`);
}
