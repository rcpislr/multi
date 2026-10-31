import Link from "next/link";
import { requireUser } from "@/auth/guard";
import { listProducts } from "@/admin/products/store";
import { createProduct } from "@/admin/products/actions";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { Badge, Card, Input } from "@/components/ui";
import { formatTRY } from "@/lib/money";

const STATUS = { taslak: ["Taslak", "yellow"], aktif: ["Aktif", "green"], arsiv: ["Arşiv", "neutral"] } as const;

export default async function ProductsPage() {
  const user = await requireUser();
  const rows = await listProducts();
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Ürünler</h1>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr><th className="px-3 py-2">Ürün</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Tekli fiyat</th><th className="px-3 py-2">Stok</th><th className="px-3 py-2">Durum</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-neutral-500">Henüz ürün yok.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2"><Link className="font-medium underline-offset-2 hover:underline" href={`/admin/products/${p.id}`}>{p.name}</Link></td>
                <td className="px-3 py-2">{p.sku}</td>
                <td className="px-3 py-2">{formatTRY(p.unitPriceMinor)}</td>
                <td className="px-3 py-2">{p.trackStock ? p.stockQty : "Takip yok"}</td>
                <td className="px-3 py-2"><Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {user.role === "admin" && (
        <Card>
          <h2 className="mb-3 font-medium">Yeni ürün</h2>
          <ActionForm action={createProduct} submitLabel="Ürünü oluştur" className="grid gap-3 sm:grid-cols-2">
            <FormField name="name" label="Ürün adı"><Input /></FormField>
            <FormField name="sku" label="SKU"><Input /></FormField>
            <FormField name="unitPriceMinor" label="Tekli fiyat (TL, KDV dahil)"><Input name="unitPrice" inputMode="decimal" /></FormField>
            <FormField name="vatRate" label="KDV (%)"><Input type="number" defaultValue={20} min={0} max={100} /></FormField>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
