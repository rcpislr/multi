"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { quote, type PaymentMethod } from "@/pricing/quote";
import { formatTRY } from "@/lib/money";
import type { LandingModel } from "@/landing/model";

type FieldErrors = Record<string, string>;
const inputCls = "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 aria-[invalid=true]:border-red-500";

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-sm text-red-600" role="alert">{msg}</p> : null;
}

export function OrderForm({ model, cities }: { model: LandingModel; cities: string[] }) {
  const router = useRouter();
  const defaultOffer = model.offers.find((o) => o.isDefault) ?? model.offers[0];
  const [offerId, setOfferId] = React.useState(defaultOffer?.id);
  const [addonSel, setAddonSel] = React.useState<Record<number, number | null>>({});
  const [payment, setPayment] = React.useState<Exclude<PaymentMethod, "online">>("cod_cash");
  const [city, setCity] = React.useState("");
  const [districts, setDistricts] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);
  const [idempotencyKey] = React.useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random())));

  const cityRequest = React.useRef(0);
  function onCityChange(next: string) {
    setCity(next);
    setDistricts([]);
    const req = ++cityRequest.current;
    if (!next) return;
    fetch(`/api/districts?city=${encodeURIComponent(next)}`)
      .then((r) => r.json())
      .then((d) => { if (req === cityRequest.current) setDistricts(d.districts ?? []); })
      .catch(() => {});
  }

  const offer = model.offers.find((o) => o.id === offerId);
  const selectedOptions = model.addons.flatMap((a) => {
    const optId = addonSel[a.id];
    const opt = a.options.find((o) => o.id === optId);
    return opt ? [{ addon: a, opt }] : [];
  });
  const q = offer ? quote({
    product: model.product,
    offer: { id: offer.id, version: offer.version, slotKey: offer.slotKey, paidQty: offer.paidQty, freeQty: offer.freeQty, totalPriceMinor: offer.priceMinor, freeShipping: offer.freeShipping },
    priceOverrideMinor: null,
    addons: selectedOptions.map(({ addon, opt }) => ({ optionId: opt.id, name: addon.name, sku: addon.sku, vatRate: addon.vatRate, qty: opt.qty, priceMinor: opt.priceMinor })),
    paymentMethod: payment,
    shipping: model.shipping,
  }) : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!offer) return;
    const fd = new FormData(e.currentTarget);
    setPending(true); setErrors({}); setFormError(undefined);
    const utm = Object.fromEntries([...new URLSearchParams(window.location.search)].filter(([k]) => /^(utm_|fbclid$)/.test(k)).slice(0, 10));
    const res = await fetch("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey, offerId: offer.id, offerVersion: offer.version, addonOptionIds: selectedOptions.map((s) => s.opt.id),
        customerName: fd.get("customerName"), phone: fd.get("phone"), city: fd.get("city"), district: fd.get("district"),
        address: fd.get("address"), paymentMethod: payment, policyAccepted: fd.get("policy") === "on", website: fd.get("website"), utm,
      }),
    }).catch(() => null);
    setPending(false);
    if (!res) { setFormError("Bağlantı hatası. Lütfen tekrar deneyin."); return; }
    const body = await res.json().catch(() => ({}));
    if (res.status === 201 && body.publicToken) { router.push(`/tesekkurler?t=${body.publicToken}`); return; }
    if (res.status === 409) { setFormError("Fiyatlar güncellendi, sayfa yenileniyor…"); setTimeout(() => window.location.reload(), 1200); return; }
    if (res.status === 422) { setErrors(body.fieldErrors ?? {}); setFormError("Lütfen işaretli alanları kontrol edin."); return; }
    if (res.ok) { setFormError("Siparişiniz alınamadı. Lütfen bizimle iletişime geçin."); return; }
    setFormError("Bir hata oluştu. Lütfen tekrar deneyin.");
  }

  if (!offer || !q) return null;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">Paket seçin</legend>
        {model.offers.map((o) => {
          const total = o.paidQty + o.freeQty;
          const saving = Math.max(0, model.product.unitPriceMinor * total - o.priceMinor);
          const active = o.id === offerId;
          return (
            <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 bg-white p-4 transition ${active ? "border-[var(--brand)] shadow-md" : "border-neutral-200"}`}>
              <input type="radio" name="offer" value={o.id} checked={active} onChange={() => setOfferId(o.id)} className="h-5 w-5 accent-[var(--brand)]" aria-label={o.label} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{o.label}</span>
                  {o.badge && <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs font-bold text-white">{o.badge}</span>}
                </div>
                <div className="mt-0.5 text-sm text-neutral-600">
                  {o.freeQty > 0 && <span className="font-semibold text-green-700">{o.freeQty} adet hediye · </span>}
                  {o.freeShipping ? "Ücretsiz kargo" : "Kargo ücreti eklenir"}
                </div>
                {saving > 0 && <div className="mt-0.5 text-sm font-semibold text-[var(--brand)]">{total > 1 ? `${total}'li pakette ` : ""}{formatTRY(saving)} kazanırsın</div>}
              </div>
              <div className="text-right">
                {saving > 0 && <div className="text-sm text-neutral-400 line-through">{formatTRY(model.product.unitPriceMinor * total)}</div>}
                <div className="text-lg font-extrabold">{formatTRY(o.priceMinor)}</div>
              </div>
            </label>
          );
        })}
      </fieldset>

      {model.addons.map((a) => (
        <fieldset key={a.id} className="space-y-2 rounded-2xl border border-dashed border-[var(--brand)] bg-[var(--brand)]/5 p-4">
          <legend className="px-1 text-sm font-bold">🔥 Siparişine ekle · {a.name}</legend>
          {a.description && <p className="text-sm text-neutral-600">{a.description}</p>}
          <div className="grid gap-2 sm:grid-cols-3">
            {a.options.map((opt) => {
              const on = addonSel[a.id] === opt.id;
              return (
                <label key={opt.id} className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-sm ${on ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/20" : "border-neutral-200"}`}>
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={on} onChange={() => setAddonSel((s) => ({ ...s, [a.id]: on ? null : opt.id }))} className="accent-[var(--brand)]" aria-label={`${a.name} ${opt.label}`} />
                    {opt.label}
                  </span>
                  <span className="font-bold">+{formatTRY(opt.priceMinor)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="space-y-3">
        <div>
          <label htmlFor="o-name" className="mb-1 block text-sm font-semibold">Ad Soyad</label>
          <input id="o-name" name="customerName" autoComplete="name" className={inputCls} aria-invalid={!!errors.customerName} required />
          <Err msg={errors.customerName} />
        </div>
        <div>
          <label htmlFor="o-phone" className="mb-1 block text-sm font-semibold">Telefon</label>
          <input id="o-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="5XX XXX XX XX" className={inputCls} aria-invalid={!!errors.phone} required />
          <Err msg={errors.phone} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="o-city" className="mb-1 block text-sm font-semibold">İl</label>
            <select id="o-city" name="city" value={city} onChange={(e) => onCityChange(e.target.value)} className={inputCls} aria-invalid={!!errors.city} required>
              <option value="">İl seçin</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Err msg={errors.city} />
          </div>
          <div>
            <label htmlFor="o-district" className="mb-1 block text-sm font-semibold">İlçe</label>
            <select id="o-district" name="district" className={inputCls} aria-invalid={!!errors.district} disabled={!districts.length} required>
              <option value="">{city ? "İlçe seçin" : "Önce il seçin"}</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <Err msg={errors.district} />
          </div>
        </div>
        <div>
          <label htmlFor="o-address" className="mb-1 block text-sm font-semibold">Adres</label>
          <textarea id="o-address" name="address" rows={3} autoComplete="street-address" placeholder="Mahalle, sokak, bina ve daire no" className={inputCls} aria-invalid={!!errors.address} required />
          <Err msg={errors.address} />
        </div>
        <div className="absolute -left-[9999px]" aria-hidden>
          <label htmlFor="o-website">Web sitesi</label>
          <input id="o-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">Ödeme</legend>
        {([["cod_cash", "Kapıda Nakit"], ["cod_card", "Kapıda Kredi Kartı"]] as const).map(([v, label]) => (
          <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 ${payment === v ? "border-[var(--brand)]" : "border-neutral-200"}`}>
            <input type="radio" name="payment" value={v} checked={payment === v} onChange={() => setPayment(v)} className="accent-[var(--brand)]" />
            <span className="font-semibold">{label}</span>
            {model.product.codFeeEnabled && (v === "cod_cash" ? model.product.codFeeCashMinor : model.product.codFeeCardMinor) > 0 && (
              <span className="ml-auto text-sm text-neutral-500">+{formatTRY(v === "cod_cash" ? model.product.codFeeCashMinor : model.product.codFeeCardMinor)} hizmet bedeli</span>
            )}
          </label>
        ))}
        <Err msg={errors.paymentMethod} />
      </fieldset>

      <div className="space-y-1 rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
        {q.lines.map((l, i) => (
          <div key={i} className="flex justify-between">
            <span>{l.lineType === "gift" ? `🎁 ${l.qty} adet hediye` : l.lineType === "paid" ? `${l.name} × ${l.qty}` : l.lineType === "addon" ? `${l.name} × ${l.qty}` : l.name}</span>
            <span>{l.lineType === "gift" ? "Bedava" : formatTRY(l.lineTotalMinor)}</span>
          </div>
        ))}
        {q.shippingMinor === 0 && <div className="flex justify-between text-green-700"><span>Kargo</span><span>Ücretsiz</span></div>}
        <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-extrabold">
          <span>Toplam</span><span data-testid="order-total">{formatTRY(q.grandTotalMinor)}</span>
        </div>
        {q.packageSavingsMinor > 0 && <div className="text-right text-sm font-bold text-[var(--brand)]">🎉 {formatTRY(q.packageSavingsMinor)} kazanıyorsun</div>}
      </div>

      <label className="flex items-start gap-2 text-sm text-neutral-600">
        <input type="checkbox" name="policy" defaultChecked required className="mt-0.5 accent-[var(--brand)]" />
        <span>Ön bilgilendirme formunu ve mesafeli satış sözleşmesini okudum, kabul ediyorum.</span>
      </label>
      <Err msg={errors.policyAccepted} />

      {formError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{formError}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-[var(--brand)] px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-black/10 disabled:opacity-60">
        {pending ? "Gönderiliyor…" : "🔒 Siparişi Tamamla — Kapıda Öde"}
      </button>
    </form>
  );
}
