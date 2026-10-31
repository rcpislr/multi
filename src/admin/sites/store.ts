import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { domains, products, sites, type Domain, type Site } from "@/db/schema";
import { SubdomainSchema } from "@/admin/validation";
import { ContentOverridesSchema } from "@/content/schema";
import { listActiveOffers } from "@/admin/offers/store";

export class SiteError extends Error {}

export function siteUrl(site: Pick<Site, "subdomain">, domain: Pick<Domain, "name">): string {
  const port = process.env.PUBLIC_PORT;
  return port ? `http://${site.subdomain}.${domain.name}:${port}` : `https://${site.subdomain}.${domain.name}`;
}

export async function listSites() {
  return db.select({ site: sites, domain: domains, product: { id: products.id, name: products.name } })
    .from(sites)
    .innerJoin(domains, eq(domains.id, sites.domainId))
    .innerJoin(products, eq(products.id, sites.productId))
    .orderBy(asc(domains.name), asc(sites.subdomain));
}

export async function getSiteWithDomain(id: number) {
  const [row] = await db.select({ site: sites, domain: domains }).from(sites).innerJoin(domains, eq(domains.id, sites.domainId)).where(eq(sites.id, id));
  return row ?? null;
}

const CreateSiteSchema = z.object({ domainId: z.number().int(), subdomain: SubdomainSchema, productId: z.number().int() });

export async function insertSite(raw: z.input<typeof CreateSiteSchema>): Promise<Site> {
  const input = CreateSiteSchema.parse(raw);
  const taken = await db.select({ id: sites.id }).from(sites).where(and(eq(sites.domainId, input.domainId), eq(sites.subdomain, input.subdomain)));
  if (taken.length) throw new SiteError("Bu adres zaten kullanılıyor.");
  try {
    const [site] = await db.insert(sites).values({ ...input, status: "taslak" }).returning();
    return site!;
  } catch (e) {
    if (String((e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code) === "23505") throw new SiteError("Bu adres zaten kullanılıyor.");
    throw e;
  }
}

export const UpdateSiteSchema = z.object({
  status: z.enum(["taslak", "yayinda", "kapali", "yonlendir"]).optional(),
  redirectUrl: z.string().trim().url("Geçerli bir adres girin.").startsWith("https://", "Adres https:// ile başlamalı.").nullable().optional(),
  metaPixelId: z.string().trim().regex(/^\d{5,20}$/, "Pixel kimliği sadece rakamlardan oluşmalı.").nullable().optional(),
  metaCapiToken: z.string().trim().max(400).nullable().optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
  contentOverrides: ContentOverridesSchema.optional(),
  priceOverrides: z.record(z.string(), z.number().int().min(0)).optional(),
});
export type UpdateSiteInput = z.input<typeof UpdateSiteSchema>;

export async function updateSiteById(id: number, raw: UpdateSiteInput): Promise<Site> {
  const input = UpdateSiteSchema.parse(raw);
  const [current] = await db.select().from(sites).where(eq(sites.id, id));
  if (!current) throw new SiteError("Site bulunamadı.");
  const status = input.status ?? current.status;
  const redirectUrl = input.redirectUrl !== undefined ? input.redirectUrl : current.redirectUrl;
  if (status === "yonlendir" && !redirectUrl) throw new SiteError("Yönlendirme için hedef adres gerekli.");
  if (input.priceOverrides) {
    const slots = new Set((await listActiveOffers(current.productId)).map((o) => o.slotKey));
    const unknown = Object.keys(input.priceOverrides).filter((k) => !slots.has(k));
    if (unknown.length) throw new SiteError(`Bilinmeyen paket: ${unknown.join(", ")}`);
  }
  const [site] = await db.update(sites).set({ ...input, redirectUrl }).where(eq(sites.id, id)).returning();
  return site!;
}
