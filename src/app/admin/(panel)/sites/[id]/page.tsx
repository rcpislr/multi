import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/guard";
import { getSiteWithDomain, siteUrl } from "@/admin/sites/store";
import { listActiveOffers } from "@/admin/offers/store";
import { getProduct } from "@/admin/products/store";
import { updateSiteForm } from "@/admin/sites/actions";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { Card, Input, Select } from "@/components/ui";
import { formatTRY } from "@/lib/money";
import { previewToken } from "@/landing/preview";
import { minorToInput } from "@/lib/format";
import type { ContentOverrides } from "@/content/schema";

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const row = await getSiteWithDomain(Number((await params).id));
  if (!row) notFound();
  const { site, domain } = row;
  const [offers, product] = await Promise.all([listActiveOffers(site.productId), getProduct(site.productId)]);
  const o = site.contentOverrides as ContentOverrides;
  const url = siteUrl(site, domain);
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/sites" className="text-sm text-neutral-500">← Siteler</Link>
        <h1 className="text-xl font-semibold">{site.subdomain}.{domain.name}</h1>
        <a className="text-sm underline" href={`${url}/?preview=${previewToken(site.id)}`} target="_blank" rel="noreferrer">Önizle</a>
      </div>
      {product && product.status !== "aktif" && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-700" role="alert">
          Bu sitenin ürünü ({product.name}) aktif değil. Ürün aktif olana kadar sayfa açılmaz ve sipariş alınmaz.
        </p>
      )}
      {site.status === "yayinda" && !site.metaPixelId && (
        <p className="rounded bg-yellow-50 p-2 text-sm text-yellow-800" role="alert">Bu site yayında ama Meta pixel kimliği girilmemiş. Reklam dönüşümleri ölçülmeyecek.</p>
      )}
      <Card>
        <ActionForm action={updateSiteForm} className="space-y-4">
          <input type="hidden" name="id" value={site.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField name="status" label="Durum">
              <Select defaultValue={site.status}>
                <option value="taslak">Taslak</option><option value="yayinda">Yayında</option>
                <option value="kapali">Kapalı</option><option value="yonlendir">Yönlendir</option>
              </Select>
            </FormField>
            <FormField name="redirectUrl" label="Yönlendirme adresi" hint="Sadece Yönlendir durumunda kullanılır."><Input defaultValue={site.redirectUrl ?? ""} placeholder="https://" /></FormField>
            <FormField name="metaPixelId" label="Meta pixel kimliği"><Input defaultValue={site.metaPixelId ?? ""} inputMode="numeric" /></FormField>
            <FormField name="metaCapiToken" label="Conversions API erişim anahtarı"><Input type="password" defaultValue={site.metaCapiToken ?? ""} autoComplete="off" /></FormField>
          </div>
          <fieldset className="space-y-3 rounded border p-3">
            <legend className="px-1 text-sm font-medium">Bu siteye özel içerik (boş = ürün içeriği)</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField name="heroTitle" label="Başlık"><Input defaultValue={o.hero?.title ?? ""} /></FormField>
              <FormField name="heroSubtitle" label="Alt başlık"><Input defaultValue={o.hero?.subtitle ?? ""} /></FormField>
              <FormField name="heroImageUrl" label="Hero görseli"><Input defaultValue={o.hero?.imageUrl ?? ""} /></FormField>
              <FormField name="heroVideoUrl" label="Hero videosu"><Input defaultValue={o.hero?.videoUrl ?? ""} /></FormField>
              <FormField name="primaryColor" label="Ana renk" hint="#RRGGBB"><Input defaultValue={o.theme?.primaryColor ?? ""} /></FormField>
            </div>
          </fieldset>
          <fieldset className="space-y-3 rounded border p-3">
            <legend className="px-1 text-sm font-medium">Bu siteye özel paket fiyatları (boş = ürün fiyatı)</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {offers.map((of) => (
                <FormField key={of.slotKey} name={`price:${of.slotKey}`} label={`${of.label} (${formatTRY(of.totalPriceMinor)})`}>
                  <Input defaultValue={minorToInput(site.priceOverrides[of.slotKey])} inputMode="decimal" />
                </FormField>
              ))}
            </div>
          </fieldset>
        </ActionForm>
      </Card>
    </div>
  );
}
