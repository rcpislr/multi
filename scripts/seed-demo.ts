// Idempotent demo data for local development: localhost domain, one product with
// three packages and an add-on, and the published site poset.localhost.
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { addonOptions, addons, domains, offers, products, sites } from "@/db/schema";
import { emptyProductContent, type ProductContent } from "@/content/schema";
import { getSettings, updateSettings } from "@/admin/settings/store";

const content: ProductContent = {
  ...emptyProductContent(),
  enabledSections: ["announcement", "marquee", "hero", "problems", "features", "steps", "specs", "useCases", "faq"],
  announcement: "🚚 2 ve üzeri pakette kargo ücretsiz · Kapıda ödeme",
  marquee: ["🔥 Isı ile hava almaz kapatma", "🔋 2×AA pille çalışır", "✋ Avuç içi mini boy", "💳 Kapıda ödeme"],
  hero: { title: "Mini Poşet Kapatıcı", subtitle: "Açılan paketleri tek dokunuşla ısıyla mühürle, tazeliği koru.", ctaLabel: "Hemen Sipariş Ver" },
  problems: [
    { icon: "🥔", title: "Cips yumuşuyor", text: "Açık kalan paket nem alır, çıtırlığı gider." },
    { icon: "☕", title: "Aroma kaçıyor", text: "Kahve ve baharat kokusunu kaybeder." },
    { icon: "📎", title: "Mandal tutmuyor", text: "Lastik kopar, klips kaybolur." },
  ],
  features: [
    { icon: "🔥", title: "Isı ile kapatır", text: "Poşetin ağzını boydan boya mühürler, hava ve nem girmez." },
    { icon: "👆", title: "Tek tuş", text: "Bas, kaydır, bitti. Ayar yok." },
    { icon: "🔋", title: "Kablosuz", text: "2 adet AA pil ile her yerde çalışır." },
  ],
  steps: [
    { title: "Yerleştir", text: "Poşetin ağzını düz tutup uca yerleştir." },
    { title: "Bastır", text: "Tuşa basılı tut, uç ısınsın." },
    { title: "Kaydır", text: "Bir uçtan diğerine kaydır, poşet mühürlensin." },
  ],
  specs: [{ label: "Güç", value: "2 × AA pil (dahil değil)" }, { label: "Boyut", value: "Avuç içi" }],
  useCases: [
    { title: "Mutfak", text: "Cips, kuruyemiş, kahve, baharat paketleri." },
    { title: "Piknik ve seyahat", text: "Çantada yer kaplamaz, açılan paketi kapatırsın." },
  ],
  faq: [
    { q: "Pil dahil mi?", a: "Hayır, 2 adet AA pil ile çalışır." },
    { q: "Ödemeyi nasıl yapacağım?", a: "Kapıda nakit veya kredi kartı ile ödeyebilirsiniz." },
  ],
  theme: { primaryColor: "#E23E7B" },
};

async function main() {
  const s = await getSettings();
  if (!s.shippingFeeMinor) await updateSettings({ shippingFeeMinor: 4990, businessInfo: { legalName: "Demo Ticaret Ltd. Şti.", phone: "0850 000 00 00" } });

  let [domain] = await db.select().from(domains).where(eq(domains.name, "localhost"));
  if (!domain) [domain] = await db.insert(domains).values({ name: "localhost" }).returning();

  let [product] = await db.select().from(products).where(eq(products.sku, "PK1"));
  if (!product) {
    [product] = await db.insert(products).values({ name: "Mini Poşet Kapatıcı", sku: "PK1", vatRate: 20, costMinor: 9000, unitPriceMinor: 39900, content, status: "aktif" }).returning();
  } else {
    await db.update(products).set({ content }).where(eq(products.id, product.id));
  }
  const pid = product!.id;

  const existingOffers = await db.select().from(offers).where(eq(offers.productId, pid));
  if (!existingOffers.length) {
    await db.insert(offers).values([
      { productId: pid, slotKey: "one", version: 1, label: "1 Adet", paidQty: 1, freeQty: 0, totalPriceMinor: 39900, freeShipping: false, sortOrder: 1 },
      { productId: pid, slotKey: "two", version: 1, label: "2 Adet", badge: "En çok tercih edilen", paidQty: 2, freeQty: 0, totalPriceMinor: 59900, freeShipping: true, sortOrder: 2, isDefault: true },
      { productId: pid, slotKey: "3al2", version: 1, label: "3 Al 2 Öde", badge: "En avantajlı", paidQty: 2, freeQty: 1, totalPriceMinor: 59900, freeShipping: true, sortOrder: 3 },
    ]);
  }

  const existingAddons = await db.select().from(addons).where(eq(addons.productId, pid));
  if (!existingAddons.length) {
    const [addon] = await db.insert(addons).values({ productId: pid, name: "Deterjan Hazneli Fırça", sku: "FR1", description: "Sapındaki hazneye deterjanı doldur, tek tuşla köpürt." }).returning();
    await db.insert(addonOptions).values([
      { addonId: addon!.id, qty: 1, priceMinor: 10000, label: "1 Adet", sortOrder: 1 },
      { addonId: addon!.id, qty: 2, priceMinor: 20000, label: "2 Adet", sortOrder: 2 },
    ]);
  }

  const [site] = await db.select().from(sites).where(and(eq(sites.domainId, domain!.id), eq(sites.subdomain, "poset")));
  if (!site) await db.insert(sites).values({ domainId: domain!.id, subdomain: "poset", productId: pid, status: "yayinda" });
  else await db.update(sites).set({ status: "yayinda" }).where(eq(sites.id, site.id));

  console.log("demo ready: http://poset.localhost:3000  (panel: http://panel.localhost:3000)");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
