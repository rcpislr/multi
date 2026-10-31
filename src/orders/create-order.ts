import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { addonOptions, addons, offers, orderEvents, orderItems, orders } from "@/db/schema";
import { isUniqueViolation } from "@/db/errors";
import { resolveSite } from "@/tenancy/resolve-site";
import { getSettings } from "@/admin/settings/store";
import { canonicalCity, canonicalDistrict } from "@/geo/tr";
import { PRICING_ENGINE_VERSION, quote, type QuoteInput } from "@/pricing/quote";
import { normalizeTrPhone } from "./phone";
import { newOrderNo, newPublicToken } from "./order-no";

export const OrderRequestSchema = z.object({
  idempotencyKey: z.string().uuid("Geçersiz istek."),
  offerId: z.number().int(),
  offerVersion: z.number().int(),
  addonOptionIds: z.array(z.number().int()).max(10).default([]),
  customerName: z.string().trim().min(2, "Adınızı ve soyadınızı yazın.").max(80, "İsim çok uzun."),
  phone: z.string().trim().min(1, "Telefon numaranızı yazın."),
  city: z.string().trim().min(1, "İl seçin."),
  district: z.string().trim().min(1, "İlçe seçin."),
  address: z.string().trim().min(10, "Adresinizi mahalle, sokak ve numara ile yazın.").max(300, "Adres çok uzun."),
  paymentMethod: z.enum(["cod_cash", "cod_card"], { error: "Ödeme yöntemi seçin." }),
  policyAccepted: z.literal(true, { error: "Devam etmek için sözleşmeyi onaylayın." }),
  website: z.string().default(""),
  utm: z.record(z.string(), z.string().max(200)).default({}).refine((u) => Object.keys(u).length <= 10),
  /** The total the customer saw; any difference means a price input changed while the page was open. */
  expectedGrandTotalMinor: z.number().int().min(0),
});

export type CreateOrderResult =
  | { ok: true; orderNo: string; publicToken: string }
  | { ok: false; code: "validation"; fieldErrors: Record<string, string> }
  | { ok: false; code: "not_found" | "offer_changed" | "spam" };

async function findByKey(key: string): Promise<CreateOrderResult | null> {
  const [o] = await db.select({ orderNo: orders.orderNo, publicToken: orders.publicToken }).from(orders).where(eq(orders.idempotencyKey, key));
  return o ? { ok: true, ...o } : null;
}

const invalid = (fieldErrors: Record<string, string>): CreateOrderResult => ({ ok: false, code: "validation", fieldErrors });

export async function createOrder(host: string, body: unknown, meta: { ip: string; userAgent: string }): Promise<CreateOrderResult> {
  const resolved = await resolveSite(host);
  if (!resolved || resolved.site.status !== "yayinda" || resolved.product.status !== "aktif") return { ok: false, code: "not_found" };
  const { site, product } = resolved;

  // Collect every field error in one pass so the customer fixes the form once.
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};
  const parsed = OrderRequestSchema.safeParse(body);
  if (!parsed.success) {
    for (const i of parsed.error.issues) { const k = String(i.path[0] ?? "form"); fieldErrors[k] ??= i.code === "invalid_type" ? "Bu alan gerekli." : i.message; }
  } else if (parsed.data.website.trim()) {
    return { ok: false, code: "spam" };
  }
  const phone = typeof raw.phone === "string" ? normalizeTrPhone(raw.phone) : null;
  if (!phone && !fieldErrors.phone) fieldErrors.phone = "Geçerli bir cep telefonu girin (5XX XXX XX XX).";
  let city: string | null = null;
  let district: string | null = null;
  if (typeof raw.city === "string" && raw.city.trim()) {
    city = canonicalCity(raw.city);
    if (!city) fieldErrors.city ??= "Geçerli bir il seçin.";
    else if (typeof raw.district === "string" && raw.district.trim()) {
      district = canonicalDistrict(city, raw.district);
      if (!district) fieldErrors.district ??= "Seçtiğiniz ilçe bu ile ait değil.";
    }
  }
  if (!parsed.success || !phone || !city || !district || Object.keys(fieldErrors).length) return invalid(fieldErrors);
  const req = parsed.data;

  const existing = await findByKey(req.idempotencyKey);
  if (existing) return existing;

  const [offer] = await db.select().from(offers)
    .where(and(eq(offers.id, req.offerId), eq(offers.productId, product.id), isNull(offers.archivedAt)));
  if (!offer || offer.version !== req.offerVersion) return { ok: false, code: "offer_changed" };

  const optionIds = [...new Set(req.addonOptionIds)];
  const opts = optionIds.length
    ? await db.select({ option: addonOptions, addon: addons }).from(addonOptions)
        .innerJoin(addons, eq(addons.id, addonOptions.addonId))
        .where(and(inArray(addonOptions.id, optionIds), eq(addons.productId, product.id), isNull(addons.archivedAt)))
    : [];
  // An add-on removed or not belonging to this product means the page is stale: same as a changed offer.
  if (opts.length !== optionIds.length) return { ok: false, code: "offer_changed" };
  if (new Set(opts.map((o) => o.addon.id)).size !== opts.length) return invalid({ addonOptionIds: "Aynı ek üründen tek seçenek seçilebilir." });

  const settings = await getSettings();
  const input: QuoteInput = {
    product: {
      name: product.name, sku: product.sku, vatRate: product.vatRate, unitPriceMinor: product.unitPriceMinor,
      codFeeEnabled: product.codFeeEnabled, codFeeCashMinor: product.codFeeCashMinor, codFeeCardMinor: product.codFeeCardMinor,
    },
    offer: { id: offer.id, version: offer.version, slotKey: offer.slotKey, paidQty: offer.paidQty, freeQty: offer.freeQty, totalPriceMinor: offer.totalPriceMinor, freeShipping: offer.freeShipping },
    priceOverrideMinor: site.priceOverrides[offer.slotKey] ?? null,
    addons: opts.map(({ option, addon }) => ({ optionId: option.id, name: addon.name, sku: addon.sku, vatRate: addon.vatRate, qty: option.qty, priceMinor: option.priceMinor })),
    paymentMethod: req.paymentMethod,
    shipping: { feeMinor: settings.shippingFeeMinor, freeThresholdMinor: settings.freeShippingThresholdMinor, vatRate: settings.shippingVatRate },
  };
  const q = quote(input);
  if (q.grandTotalMinor !== req.expectedGrandTotalMinor) return { ok: false, code: "offer_changed" };
  const orderNo = newOrderNo();
  const publicToken = newPublicToken();

  try {
    await db.transaction(async (tx) => {
      const [o] = await tx.insert(orders).values({
        orderNo, publicToken, idempotencyKey: req.idempotencyKey,
        siteId: site.id, productId: product.id, offerId: offer.id,
        status: "yeni", paymentMethod: req.paymentMethod, paymentStatus: "tahsil_bekliyor",
        customerName: req.customerName, phone, city, district, address: req.address,
        subtotalMinor: q.subtotalMinor, discountMinor: q.discountMinor, shippingMinor: q.shippingMinor, codFeeMinor: q.codFeeMinor,
        vatTotalMinor: q.vatTotalMinor, grandTotalMinor: q.grandTotalMinor,
        pricingSnapshot: { input, quote: q }, pricingEngineVersion: PRICING_ENGINE_VERSION,
        policyAcceptedAt: new Date(), ip: meta.ip, userAgent: meta.userAgent.slice(0, 500), utm: req.utm,
      }).returning({ id: orders.id });
      await tx.insert(orderItems).values(q.lines.map((l) => ({
        orderId: o!.id, lineType: l.lineType, productNameSnapshot: l.name, skuSnapshot: l.sku, qty: l.qty,
        unitListPriceMinor: l.unitListPriceMinor, unitPriceMinor: l.unitPriceMinor, lineTotalMinor: l.lineTotalMinor,
        vatRate: l.vatRate, vatMinor: l.vatMinor, isFree: l.isFree, offerId: l.offerId, addonOptionId: l.addonOptionId,
      })));
      await tx.insert(orderEvents).values({ orderId: o!.id, type: "created", toStatus: "yeni" });
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      const again = await findByKey(req.idempotencyKey);
      if (again) return again;
    }
    throw e;
  }
  return { ok: true, orderNo, publicToken };
}
