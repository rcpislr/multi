import type { BusinessInfo, Domain, Offer, Product, Settings, Site } from "@/db/schema";
import { ProductContentSchema, emptyProductContent, type ContentOverrides, type ProductContent } from "@/content/schema";
import type { QuoteInput } from "@/pricing/quote";
import type { AddonWithOptions } from "@/admin/addons/store";

export type LandingOffer = {
  id: number; version: number; slotKey: string; label: string; badge: string | null;
  paidQty: number; freeQty: number; priceMinor: number; freeShipping: boolean; isDefault: boolean;
};

export type LandingAddon = {
  id: number; name: string; sku: string; vatRate: number; description: string;
  options: Array<{ id: number; qty: number; priceMinor: number; label: string }>;
};

export type LandingModel = {
  siteId: number;
  host: string;
  content: ProductContent;
  offers: LandingOffer[];
  addons: LandingAddon[];
  product: QuoteInput["product"];
  shipping: QuoteInput["shipping"];
  business: BusinessInfo;
};

export type BuildLandingInput = {
  site: Pick<Site, "id" | "subdomain" | "productId" | "priceOverrides" | "contentOverrides">;
  domain: Pick<Domain, "name" | "businessInfo">;
  product: Pick<Product, "name" | "sku" | "vatRate" | "unitPriceMinor" | "codFeeEnabled" | "codFeeCashMinor" | "codFeeCardMinor" | "content">;
  offers: Offer[];
  addons: AddonWithOptions[];
  settings: Pick<Settings, "businessInfo" | "shippingFeeMinor" | "freeShippingThresholdMinor" | "shippingVatRate">;
};

export function mergeContent(base: ProductContent, overrides: ContentOverrides): ProductContent {
  const { hero, theme, ...rest } = overrides;
  const defined = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  return {
    ...base,
    ...defined,
    hero: { ...base.hero, ...Object.fromEntries(Object.entries(hero ?? {}).filter(([, v]) => v)) },
    theme: { ...base.theme, ...Object.fromEntries(Object.entries(theme ?? {}).filter(([, v]) => v)) },
  };
}

export function buildLandingModel(i: BuildLandingInput): LandingModel {
  const parsed = ProductContentSchema.safeParse(i.product.content);
  const content = mergeContent(parsed.success ? parsed.data : emptyProductContent(), i.site.contentOverrides as ContentOverrides);
  const offers = i.offers
    .filter((o) => o.archivedAt == null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((o) => ({
      id: o.id, version: o.version, slotKey: o.slotKey, label: o.label, badge: o.badge, paidQty: o.paidQty, freeQty: o.freeQty,
      priceMinor: i.site.priceOverrides[o.slotKey] ?? o.totalPriceMinor, freeShipping: o.freeShipping, isDefault: o.isDefault,
    }));
  return {
    siteId: i.site.id,
    host: `${i.site.subdomain}.${i.domain.name}`,
    content,
    offers,
    addons: i.addons.filter((a) => a.archivedAt == null && a.options.length > 0).map((a) => ({
      id: a.id, name: a.name, sku: a.sku, vatRate: a.vatRate, description: a.description,
      options: a.options.map((o) => ({ id: o.id, qty: o.qty, priceMinor: o.priceMinor, label: o.label })),
    })),
    product: {
      name: i.product.name, sku: i.product.sku, vatRate: i.product.vatRate, unitPriceMinor: i.product.unitPriceMinor,
      codFeeEnabled: i.product.codFeeEnabled, codFeeCashMinor: i.product.codFeeCashMinor, codFeeCardMinor: i.product.codFeeCardMinor,
    },
    shipping: { feeMinor: i.settings.shippingFeeMinor, freeThresholdMinor: i.settings.freeShippingThresholdMinor, vatRate: i.settings.shippingVatRate },
    business: i.domain.businessInfo ?? i.settings.businessInfo,
  };
}
