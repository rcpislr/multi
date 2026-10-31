import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/guard";
import { getProduct, productContent } from "@/admin/products/store";
import { listActiveOffers } from "@/admin/offers/store";
import { listActiveAddons } from "@/admin/addons/store";
import { updateProductGeneral } from "@/admin/products/actions";
import { archiveOfferForm, saveOfferForm } from "@/admin/offers/actions";
import { archiveAddon, saveAddon, saveAddonOption } from "@/admin/addons/actions";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { ContentEditor } from "@/components/admin/content-editor";
import { Button, Card, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatTRY } from "@/lib/money";
import { minorToInput } from "@/lib/format";

const TABS = [["genel", "Genel"], ["icerik", "İçerik"], ["paketler", "Paketler"], ["ek-urunler", "Ek ürünler"]] as const;

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await requireUser("admin");
  const [{ id }, { tab = "genel" }] = await Promise.all([params, searchParams]);
  const product = await getProduct(Number(id));
  if (!product) notFound();
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-neutral-500">← Ürünler</Link>
        <h1 className="text-xl font-semibold">{product.name}</h1>
      </div>
      <nav className="flex gap-1 border-b">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`?tab=${key}`} className={cn("-mb-px border-b-2 px-3 py-2 text-sm", tab === key ? "border-neutral-900 font-medium" : "border-transparent text-neutral-500")}>{label}</Link>
        ))}
      </nav>
      {tab === "genel" && <GeneralTab product={product} />}
      {tab === "icerik" && <ContentEditor productId={product.id} initial={productContent(product)} />}
      {tab === "paketler" && <OffersTab productId={product.id} unitPriceMinor={product.unitPriceMinor} />}
      {tab === "ek-urunler" && <AddonsTab productId={product.id} />}
    </div>
  );
}

function GeneralTab({ product: p }: { product: NonNullable<Awaited<ReturnType<typeof getProduct>>> }) {
  return (
    <Card>
      <ActionForm action={updateProductGeneral} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={p.id} />
        <FormField name="name" label="Ürün adı"><Input defaultValue={p.name} /></FormField>
        <FormField name="sku" label="SKU"><Input defaultValue={p.sku} /></FormField>
        <FormField name="unitPriceMinor" label="Tekli liste fiyatı (TL, KDV dahil)" hint="Paket kazancı bu fiyata göre hesaplanır.">
          <Input name="unitPrice" defaultValue={minorToInput(p.unitPriceMinor)} inputMode="decimal" />
        </FormField>
        <FormField name="costMinor" label="Maliyet (TL)"><Input name="cost" defaultValue={minorToInput(p.costMinor)} inputMode="decimal" /></FormField>
        <FormField name="vatRate" label="KDV (%)"><Input type="number" defaultValue={p.vatRate} min={0} max={100} /></FormField>
        <FormField name="status" label="Durum">
          <Select defaultValue={p.status}><option value="taslak">Taslak</option><option value="aktif">Aktif</option><option value="arsiv">Arşiv</option></Select>
        </FormField>
        <fieldset className="space-y-2 rounded border p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-medium">Stok</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="trackStock" defaultChecked={p.trackStock} /> Stok takibi yap</label>
          <FormField name="stockQty" label="Stok adedi"><Input type="number" defaultValue={p.stockQty} min={0} /></FormField>
        </fieldset>
        <fieldset className="space-y-2 rounded border p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-medium">Kapıda ödeme hizmet bedeli</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="codFeeEnabled" defaultChecked={p.codFeeEnabled} /> Kapıda ödeme bedeli alınsın</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField name="codFeeCashMinor" label="Kapıda nakit (TL)"><Input name="codFeeCash" defaultValue={minorToInput(p.codFeeCashMinor)} inputMode="decimal" /></FormField>
            <FormField name="codFeeCardMinor" label="Kapıda kredi kartı (TL)"><Input name="codFeeCard" defaultValue={minorToInput(p.codFeeCardMinor)} inputMode="decimal" /></FormField>
          </div>
        </fieldset>
      </ActionForm>
    </Card>
  );
}

function OfferFields({ productId, o }: { productId: number; o?: Awaited<ReturnType<typeof listActiveOffers>>[number] }) {
  return (
    <>
      <input type="hidden" name="productId" value={productId} />
      <FormField name="slotKey" label="Paket anahtarı" hint="Sürümler arasında sabit kalır (ör. 2li).">
        {o ? <Input defaultValue={o.slotKey} readOnly className="bg-neutral-50" /> : <Input placeholder="2li" />}
      </FormField>
      <FormField name="label" label="Etiket"><Input defaultValue={o?.label} placeholder="2 Adet" /></FormField>
      <FormField name="badge" label="Rozet"><Input defaultValue={o?.badge ?? ""} placeholder="En çok tercih edilen" /></FormField>
      <FormField name="paidQty" label="Ücretli adet"><Input type="number" min={1} defaultValue={o?.paidQty ?? 1} /></FormField>
      <FormField name="freeQty" label="Bedava adet" hint="3 al 2 öde: ücretli 2, bedava 1"><Input type="number" min={0} defaultValue={o?.freeQty ?? 0} /></FormField>
      <FormField name="totalPriceMinor" label="Paket fiyatı (TL)"><Input name="totalPrice" defaultValue={minorToInput(o?.totalPriceMinor)} inputMode="decimal" /></FormField>
      <FormField name="sortOrder" label="Sıra"><Input type="number" defaultValue={o?.sortOrder ?? 0} /></FormField>
      <div className="space-y-2 pt-6">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="freeShipping" defaultChecked={o?.freeShipping} /> Kargo ücretsiz</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" defaultChecked={o?.isDefault} /> Varsayılan seçili</label>
      </div>
    </>
  );
}

async function OffersTab({ productId, unitPriceMinor }: { productId: number; unitPriceMinor: number }) {
  const offers = await listActiveOffers(productId);
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">Bir paketi kaydetmek yeni bir sürüm oluşturur; eski siparişler eski sürüme bağlı kalır.</p>
      {offers.map((o) => (
        <Card key={o.id}>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm"><span className="font-medium">{o.label}</span> · {formatTRY(o.totalPriceMinor)} · sürüm {o.version}
              {o.paidQty + o.freeQty > 0 && <span className="text-neutral-500"> · kazanç {formatTRY(Math.max(0, unitPriceMinor * (o.paidQty + o.freeQty) - o.totalPriceMinor))}</span>}
            </div>
            <form action={archiveOfferForm}>
              <input type="hidden" name="offerId" value={o.id} /><input type="hidden" name="productId" value={productId} />
              <Button variant="ghost" type="submit">Kaldır</Button>
            </form>
          </div>
          <ActionForm action={saveOfferForm} className="grid gap-3 sm:grid-cols-4"><OfferFields productId={productId} o={o} /></ActionForm>
        </Card>
      ))}
      <Card>
        <h2 className="mb-3 font-medium">Yeni paket</h2>
        <ActionForm action={saveOfferForm} submitLabel="Paketi ekle" className="grid gap-3 sm:grid-cols-4"><OfferFields productId={productId} /></ActionForm>
      </Card>
    </div>
  );
}

async function AddonsTab({ productId }: { productId: number }) {
  const addons = await listActiveAddons(productId);
  return (
    <div className="space-y-4">
      {addons.map((a) => (
        <Card key={a.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{a.name}</span>
            <form action={archiveAddon}>
              <input type="hidden" name="addonId" value={a.id} /><input type="hidden" name="productId" value={productId} />
              <Button variant="ghost" type="submit">Kaldır</Button>
            </form>
          </div>
          <ActionForm action={saveAddon} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="productId" value={productId} /><input type="hidden" name="id" value={a.id} />
            <AddonFields a={a} />
          </ActionForm>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Adet seçenekleri</h3>
            {[...a.options, null].map((o) => (
              <ActionForm key={o?.id ?? "new"} action={saveAddonOption} submitLabel={o ? "Kaydet" : "Seçenek ekle"} className="grid items-end gap-3 sm:grid-cols-5">
                <input type="hidden" name="productId" value={productId} /><input type="hidden" name="addonId" value={a.id} />
                {o && <input type="hidden" name="id" value={o.id} />}
                <FormField name="label" label="Etiket"><Input defaultValue={o?.label} placeholder="1 Adet" /></FormField>
                <FormField name="qty" label="Adet"><Input type="number" min={1} defaultValue={o?.qty ?? 1} /></FormField>
                <FormField name="priceMinor" label="Fiyat (TL)"><Input name="price" defaultValue={minorToInput(o?.priceMinor)} inputMode="decimal" /></FormField>
                <FormField name="sortOrder" label="Sıra"><Input type="number" defaultValue={o?.sortOrder ?? 0} /></FormField>
              </ActionForm>
            ))}
          </div>
        </Card>
      ))}
      <Card>
        <h2 className="mb-3 font-medium">Yeni ek ürün</h2>
        <ActionForm action={saveAddon} submitLabel="Ek ürünü ekle" className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="productId" value={productId} />
          <AddonFields />
        </ActionForm>
      </Card>
    </div>
  );
}

function AddonFields({ a }: { a?: { name: string; sku: string; vatRate: number; description: string } }) {
  return (
    <>
      <FormField name="name" label="Ad"><Input defaultValue={a?.name} /></FormField>
      <FormField name="sku" label="SKU"><Input defaultValue={a?.sku} /></FormField>
      <FormField name="vatRate" label="KDV (%)"><Input type="number" defaultValue={a?.vatRate ?? 20} min={0} max={100} /></FormField>
      <FormField name="description" label="Tanıtım metni"><Input defaultValue={a?.description} /></FormField>
    </>
  );
}
