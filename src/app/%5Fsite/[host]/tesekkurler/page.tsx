import { notFound } from "next/navigation";
import { resolveSite } from "@/tenancy/resolve-site";
import { getPublicOrder } from "@/orders/public";
import { formatTRY } from "@/lib/money";
import { formatTrPhone } from "@/orders/phone";
import { ProductContentSchema } from "@/content/schema";

export const metadata = { title: "Siparişiniz alındı", robots: { index: false } };

const PAYMENT = { cod_cash: "Kapıda nakit", cod_card: "Kapıda kredi kartı", online: "Online ödeme" } as const;

export default async function ThanksPage({ params, searchParams }: { params: Promise<{ host: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ host }, { t }] = await Promise.all([params, searchParams]);
  const resolved = await resolveSite(decodeURIComponent(host));
  if (!resolved || !t) notFound();
  const data = await getPublicOrder(resolved.site.id, t);
  if (!data) notFound();
  const { order: o, items } = data;
  const content = ProductContentSchema.safeParse(resolved.product.content);
  const brand = content.success ? content.data.theme.primaryColor : "#111111";
  return (
    <main style={{ ["--brand" as string]: brand }} className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-md space-y-5">
        <div className="text-center">
          <div className="text-5xl" aria-hidden>✅</div>
          <h1 className="mt-3 text-2xl font-extrabold">Siparişiniz alındı</h1>
          <p className="mt-2 text-neutral-600">Teşekkür ederiz {o.customerName.split(" ")[0]}. Siparişiniz en kısa sürede kargoya verilecek.</p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
          <div className="flex justify-between"><span className="text-neutral-500">Sipariş no</span><span className="font-mono font-bold" data-testid="order-no">{o.orderNo}</span></div>
          <div className="mt-1 flex justify-between"><span className="text-neutral-500">Ödeme</span><span>{PAYMENT[o.paymentMethod]}</span></div>
          <div className="mt-1 flex justify-between"><span className="text-neutral-500">Telefon</span><span>{formatTrPhone(o.phone)}</span></div>
          <div className="mt-3 space-y-1 border-t pt-3">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between">
                <span>{i.lineType === "gift" ? `🎁 ${i.productNameSnapshot} × ${i.qty} (hediye)` : i.lineType === "shipping" || i.lineType === "cod_fee" ? i.productNameSnapshot : `${i.productNameSnapshot} × ${i.qty}`}</span>
                <span>{i.isFree ? "Bedava" : formatTRY(i.lineTotalMinor)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t pt-3 text-base font-extrabold"><span>Toplam</span><span>{formatTRY(o.grandTotalMinor)}</span></div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
          <div className="font-semibold">Teslimat adresi</div>
          <p className="mt-1 text-neutral-600">{o.address}<br />{o.district} / {o.city}</p>
        </div>
      </div>
    </main>
  );
}
