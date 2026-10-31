// Pure pricing engine. Runs on server and in the browser: no DB or Next imports.
import { vatFromGross } from "@/lib/money";

export const PRICING_ENGINE_VERSION = 1;

export type PaymentMethod = "cod_cash" | "cod_card" | "online";
export type LineType = "paid" | "gift" | "addon" | "shipping" | "cod_fee";

export interface QuoteInput {
  product: {
    name: string; sku: string; vatRate: number; unitPriceMinor: number;
    codFeeEnabled: boolean; codFeeCashMinor: number; codFeeCardMinor: number;
  };
  offer: {
    id: number; version: number; slotKey: string; paidQty: number; freeQty: number;
    totalPriceMinor: number; freeShipping: boolean;
  };
  priceOverrideMinor: number | null;
  addons: Array<{ optionId: number; name: string; sku: string; vatRate: number; qty: number; priceMinor: number }>;
  paymentMethod: PaymentMethod;
  shipping: { feeMinor: number; freeThresholdMinor: number | null; vatRate: number };
}

export interface QuoteLine {
  lineType: LineType; name: string; sku: string; qty: number;
  unitListPriceMinor: number; unitPriceMinor: number; lineTotalMinor: number;
  vatRate: number; vatMinor: number; isFree: boolean; offerId: number | null; addonOptionId: number | null;
}

export interface Quote {
  lines: QuoteLine[];
  subtotalMinor: number; discountMinor: number; shippingMinor: number; codFeeMinor: number;
  vatTotalMinor: number; grandTotalMinor: number; physicalQty: number; packageSavingsMinor: number;
  engineVersion: number;
}

function line(l: Omit<QuoteLine, "vatMinor">): QuoteLine {
  return { ...l, vatMinor: vatFromGross(l.lineTotalMinor, l.vatRate) };
}

export function quote(input: QuoteInput): Quote {
  const { product, offer, shipping } = input;
  const lines: QuoteLine[] = [];

  const paidTotal = input.priceOverrideMinor ?? offer.totalPriceMinor;
  lines.push(line({
    lineType: "paid", name: product.name, sku: product.sku, qty: offer.paidQty,
    unitListPriceMinor: product.unitPriceMinor, unitPriceMinor: Math.round(paidTotal / offer.paidQty),
    lineTotalMinor: paidTotal, vatRate: product.vatRate, isFree: false, offerId: offer.id, addonOptionId: null,
  }));

  if (offer.freeQty > 0) {
    lines.push(line({
      lineType: "gift", name: product.name, sku: product.sku, qty: offer.freeQty,
      unitListPriceMinor: product.unitPriceMinor, unitPriceMinor: 0, lineTotalMinor: 0,
      vatRate: product.vatRate, isFree: true, offerId: offer.id, addonOptionId: null,
    }));
  }

  for (const a of input.addons) {
    lines.push(line({
      lineType: "addon", name: a.name, sku: a.sku, qty: a.qty,
      unitListPriceMinor: Math.round(a.priceMinor / a.qty), unitPriceMinor: Math.round(a.priceMinor / a.qty),
      lineTotalMinor: a.priceMinor, vatRate: a.vatRate, isFree: false, offerId: null, addonOptionId: a.optionId,
    }));
  }

  const subtotalMinor = lines.reduce((s, l) => s + l.lineTotalMinor, 0);

  let shippingMinor = shipping.feeMinor;
  if (offer.freeShipping) shippingMinor = 0;
  else if (shipping.freeThresholdMinor != null && subtotalMinor >= shipping.freeThresholdMinor) shippingMinor = 0;
  if (shippingMinor > 0) {
    lines.push(line({
      lineType: "shipping", name: "Kargo", sku: "KARGO", qty: 1, unitListPriceMinor: shippingMinor,
      unitPriceMinor: shippingMinor, lineTotalMinor: shippingMinor, vatRate: shipping.vatRate,
      isFree: false, offerId: null, addonOptionId: null,
    }));
  }

  let codFeeMinor = 0;
  if (product.codFeeEnabled) {
    if (input.paymentMethod === "cod_cash") codFeeMinor = product.codFeeCashMinor;
    else if (input.paymentMethod === "cod_card") codFeeMinor = product.codFeeCardMinor;
  }
  if (codFeeMinor > 0) {
    lines.push(line({
      lineType: "cod_fee", name: "Kapıda ödeme hizmet bedeli", sku: "KAPIDA", qty: 1,
      unitListPriceMinor: codFeeMinor, unitPriceMinor: codFeeMinor, lineTotalMinor: codFeeMinor,
      vatRate: shipping.vatRate, isFree: false, offerId: null, addonOptionId: null,
    }));
  }

  const discountMinor = lines.filter((l) => l.lineType === "gift").reduce((s, l) => s + l.qty * l.unitListPriceMinor, 0);
  const vatTotalMinor = lines.reduce((s, l) => s + l.vatMinor, 0);
  const physicalQty = offer.paidQty + offer.freeQty;

  return {
    lines, subtotalMinor, discountMinor, shippingMinor, codFeeMinor, vatTotalMinor,
    grandTotalMinor: subtotalMinor + shippingMinor + codFeeMinor,
    physicalQty,
    packageSavingsMinor: Math.max(0, product.unitPriceMinor * physicalQty - paidTotal),
    engineVersion: PRICING_ENGINE_VERSION,
  };
}
