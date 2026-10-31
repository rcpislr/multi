import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/guard";
import { getOrderDetail } from "@/admin/orders/queries";
import { changeStatusForm, editOrderForm } from "@/admin/orders/actions";
import { ORDER_STATUS_LABELS, nextStatuses } from "@/orders/status";
import { formatTrPhone } from "@/orders/phone";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";
import { formatTRY } from "@/lib/money";

const PAYMENT = { cod_cash: "Kapıda nakit", cod_card: "Kapıda kredi kartı", online: "Online" } as const;
const fmt = (d: Date) => d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const d = await getOrderDetail(Number((await params).id));
  if (!d) notFound();
  const o = d.order;
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-neutral-500">← Siparişler</Link>
        <h1 className="font-mono text-xl font-semibold">{o.orderNo}</h1>
        <Badge>{ORDER_STATUS_LABELS[o.status]}</Badge>
        <span className="text-sm text-neutral-500">{fmt(o.createdAt)} · {d.siteHost}</span>
      </div>
      <Card className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Durumu değiştir:</span>
        {nextStatuses(o.status).length === 0 && <span className="text-sm text-neutral-500">Bu durumdan geçiş yok.</span>}
        {nextStatuses(o.status).map((s) => (
          <form key={s} action={changeStatusForm}>
            <input type="hidden" name="id" value={o.id} /><input type="hidden" name="to" value={s} />
            <Button type="submit" variant={s === "iptal" || s === "iade" ? "danger" : "secondary"}>{ORDER_STATUS_LABELS[s]}</Button>
          </form>
        ))}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium">Müşteri</h2>
          <p className="mb-3 text-sm">Telefon: <a className="font-mono underline" href={`tel:+${o.phone}`}>{formatTrPhone(o.phone)}</a></p>
          <ActionForm action={editOrderForm}>
            <input type="hidden" name="id" value={o.id} />
            <FormField name="customerName" label="Ad Soyad"><Input defaultValue={o.customerName} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField name="city" label="İl"><Input defaultValue={o.city} /></FormField>
              <FormField name="district" label="İlçe"><Input defaultValue={o.district} /></FormField>
            </div>
            <FormField name="address" label="Adres"><Textarea defaultValue={o.address} /></FormField>
            <FormField name="internalNote" label="İç not"><Textarea defaultValue={o.internalNote} /></FormField>
          </ActionForm>
        </Card>
        <Card>
          <h2 className="mb-3 font-medium">Sipariş</h2>
          <div className="text-sm text-neutral-600">{d.productName} · {d.offerLabel} · {PAYMENT[o.paymentMethod]}</div>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {d.items.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="py-1.5">{i.productNameSnapshot}{i.isFree && <Badge tone="green" className="ml-1">Hediye</Badge>}</td>
                  <td className="py-1.5 text-right">{i.qty}</td>
                  <td className="py-1.5 text-right">{i.isFree ? "Bedava" : formatTRY(i.lineTotalMinor)}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold"><td className="py-1.5">Toplam</td><td /><td className="py-1.5 text-right">{formatTRY(o.grandTotalMinor)}</td></tr>
              <tr className="text-neutral-500"><td className="py-1">KDV dahil</td><td /><td className="py-1 text-right">{formatTRY(o.vatTotalMinor)}</td></tr>
            </tbody>
          </table>
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer text-neutral-500">Fiyat hesaplama kaydı</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-neutral-50 p-2">{JSON.stringify(o.pricingSnapshot, null, 2)}</pre>
          </details>
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 font-medium">Geçmiş</h2>
        <ul className="space-y-1 text-sm">
          {d.events.map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className="w-28 shrink-0 text-neutral-500">{fmt(e.createdAt)}</span>
              <span>
                {e.type === "created" && "Sipariş oluşturuldu"}
                {e.type === "status_changed" && `${e.fromStatus ? ORDER_STATUS_LABELS[e.fromStatus] : "?"} → ${e.toStatus ? ORDER_STATUS_LABELS[e.toStatus] : "?"}`}
                {e.type === "edited" && `Düzenlendi: ${Object.keys((e.diff ?? {}) as object).join(", ")}`}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
