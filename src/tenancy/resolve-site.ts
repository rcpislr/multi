import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { domains, products, sites, type Domain, type Product, type Site } from "@/db/schema";
import { normalizeHost } from "./host";

export type ResolvedSite = { site: Site; domain: Domain; product: Product };

export async function resolveSite(host: string, opts?: { allowDraft?: boolean }): Promise<ResolvedSite | null> {
  const h = normalizeHost(host);
  const [domain] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.active, true), sql`${h} LIKE '%.' || ${domains.name}`))
    .orderBy(desc(sql`length(${domains.name})`))
    .limit(1);
  if (!domain) return null;
  const subdomain = h.slice(0, h.length - domain.name.length - 1);
  if (!subdomain) return null;
  const [row] = await db
    .select({ site: sites, product: products })
    .from(sites)
    .innerJoin(products, eq(products.id, sites.productId))
    .where(and(eq(sites.domainId, domain.id), eq(sites.subdomain, subdomain)))
    .limit(1);
  if (!row) return null;
  const allowed = opts?.allowDraft ? ["yayinda", "yonlendir", "taslak"] : ["yayinda", "yonlendir"];
  if (!allowed.includes(row.site.status)) return null;
  if (!opts?.allowDraft && row.product.status !== "aktif") return null;
  return { site: row.site, domain, product: row.product };
}
