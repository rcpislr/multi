import Link from "next/link";
import { asc } from "drizzle-orm";
import { requireUser } from "@/auth/guard";
import { db } from "@/db/client";
import { domains, products } from "@/db/schema";
import { listSites, siteUrl } from "@/admin/sites/store";
import { createSiteForm } from "@/admin/sites/actions";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { Badge, Card, Select } from "@/components/ui";
import { SubdomainPreview } from "./subdomain-preview";

const STATUS = { taslak: ["Taslak", "yellow"], yayinda: ["Yayında", "green"], kapali: ["Kapalı", "neutral"], yonlendir: ["Yönlendiriliyor", "blue"] } as const;

export default async function SitesPage() {
  const user = await requireUser();
  const [rows, allDomains, allProducts] = await Promise.all([
    listSites(),
    db.select().from(domains).orderBy(asc(domains.name)),
    db.select({ id: products.id, name: products.name }).from(products).orderBy(asc(products.name)),
  ]);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Siteler</h1>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr><th className="px-3 py-2">Adres</th><th className="px-3 py-2">Ürün</th><th className="px-3 py-2">Durum</th><th className="px-3 py-2">Pixel</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-neutral-500">Henüz site yok.</td></tr>}
            {rows.map(({ site, domain, product }) => (
              <tr key={site.id} className="border-t">
                <td className="px-3 py-2"><a className="underline-offset-2 hover:underline" href={siteUrl(site, domain)} target="_blank" rel="noreferrer">{site.subdomain}.{domain.name}</a></td>
                <td className="px-3 py-2">{product.name}</td>
                <td className="px-3 py-2"><Badge tone={STATUS[site.status][1]}>{STATUS[site.status][0]}</Badge></td>
                <td className="px-3 py-2">{site.metaPixelId ? <Badge tone="green">Var</Badge> : <Badge tone="red">Yok</Badge>}</td>
                <td className="px-3 py-2 text-right">{user.role === "admin" && <Link className="text-sm underline" href={`/admin/sites/${site.id}`}>Düzenle</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {user.role === "admin" && (
        <Card>
          <h2 className="mb-3 font-medium">Yeni site</h2>
          {allDomains.length === 0 || allProducts.length === 0 ? (
            <p className="text-sm text-neutral-600">Site açmak için önce bir domain ve bir ürün ekleyin.</p>
          ) : (
            <ActionForm action={createSiteForm} submitLabel="Siteyi oluştur" className="grid gap-3 sm:grid-cols-3">
              <SubdomainPreview domains={allDomains.map((d) => ({ id: d.id, name: d.name }))} />
              <FormField name="productId" label="Ürün">
                <Select>{allProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
              </FormField>
            </ActionForm>
          )}
        </Card>
      )}
    </div>
  );
}
