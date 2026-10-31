# Plan 1: Çekirdek (subdomain + panel + fiyat motoru + landing + kapıda ödeme siparişi) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `poset.localhost:3000` gibi bir subdomain'de panelden yönetilen ürünün landing sayfası açılsın, müşteri kapıda ödemeli sipariş versin, sipariş `panel.localhost:3000` adresindeki tek sipariş paneline düşsün.

**Architecture:** Tek Next.js (App Router) uygulaması. Middleware, Host başlığına bakarak isteği ya panele (`/admin`) ya da site render rotasına (`/_site/[host]`) yönlendirir. Site çözümleme ve bütün veritabanı işleri Node runtime'da yapılır. Fiyat, saf bir `quote()` fonksiyonunda hesaplanır. Sayfadaki toplamı da sipariş kaydını da bu fonksiyon üretir.

**Tech Stack:** Node 22, pnpm, Next.js (güncel kararlı sürüm), TypeScript strict, PostgreSQL 16 (Docker), Drizzle ORM + drizzle-kit + postgres.js, Better Auth, Tailwind + shadcn/ui, TanStack Table, React Hook Form + Zod, Vitest, Playwright.

**Spec:** `/home/user/docs/superpowers/specs/2026-10-31-coklu-subdomain-siparis-sistemi-design.md`

**Bu planın kapsamı dışında (sonraki planlar):**
- Plan 2: OTP, mükerrer/kara liste/hız sınırı, stok hareketleri, pg-boss, Telegram, 2FA.
- Plan 3: pixel + CAPI, zamanlı teklif ve geri sayım, canlı sipariş bildirimi, yasal sayfalar, çerez bandı.
- Plan 4: yapay zekâ ürün sihirbazı, medya yükleme, yorumlar.

Bu planda siparişler doğrudan `yeni` durumunda oluşur. Plan 2, OTP adımını `dogrulama_bekliyor` olarak araya ekler.

## Global Constraints

- Proje dizini: `/home/user/satis-paneli`. Spec ve planlar Task 1'de `docs/superpowers/` altına kopyalanır.
- Para alanlarının hepsi kuruş cinsinden tam sayı (`integer`). Ondalık/float para yok. Para birimi TRY.
- Fiyatlar KDV dahil girilir ve gösterilir. KDV oranı yüzde olarak tam sayı (ör. `20`).
- Tarayıcıdan fiyat kabul edilmez. Sunucu `quote()` ile hesaplar.
- Panel adresi `PANEL_HOST` ortam değişkeninden gelir, yerelde `panel.localhost`. Domain adları kodda sabit yazılmaz, `localhost` sıradan bir `domains` kaydıdır.
- Rezerve subdomain'ler: `panel`, `www`, `api`, `admin`.
- Telefon görünen formatı `5XX XXX XX XX`, veritabanında `905XXXXXXXXX` (12 hane).
- Arayüz metinleri Türkçe. Kod tanımlayıcıları İngilizce.
- Sipariş durumları: `dogrulama_bekliyor`, `dogrulanmadi`, `yeni`, `onaylandi`, `kargoda`, `teslim_edildi`, `iptal`, `iade`.
- Ödeme türleri: `cod_cash`, `cod_card`, `online`. Kapıda ödeme durumları: `tahsil_bekliyor`, `tahsil_edildi`, `tahsil_edilemedi`.
- Kalem türleri: `paid`, `gift`, `addon`, `shipping`, `cod_fee`.
- Roller: `admin`, `operator`. CSV dışa aktarma sadece `admin`.
- Operatör siparişte sadece `customerName`, `city`, `district`, `address`, `internalNote` alanlarını düzenleyebilir.
- Her sitenin pixel'i ayrı. Bu planda `sites.metaPixelId` ve `sites.metaCapiToken` sadece saklanır, kullanılmaz.

## Review Focus

1. **Kurcalanmış form gönderimi.** Başka ürünün teklif kimliği, arşivlenmiş teklif veya başka ürünün ek ürünü gönderilirse sipariş oluşmamalı, hata dönmeli. Test: Task 11, `rejects offer from another product`, `rejects addon from another product`.
2. **Çift tıklama / çift gönderim.** Aynı form iki kez gönderilirse tek sipariş oluşmalı ve ikinci istek aynı sipariş numarasını dönmeli. Test: Task 11, `same idempotency key returns same order`.
3. **Sayfa açıkken teklifin değişmesi.** Teklif sürümü arşivlenmişse sipariş reddedilmeli ve sayfa yeni fiyatla yenilenmeli. Eski fiyatla sipariş alınmamalı. Test: Task 11, `rejects archived offer with offer_changed`.
4. **Bilinmeyen, kapalı veya taslak site adresi ve panelin site adresinden erişilmesi.** 404 dönmeli, panel rotaları site adresinde açılmamalı. Test: Task 3, `routeForRequest` tablosu ve `resolveSite` testleri.
5. **Türkçe büyük/küçük harf ve telefon formatları.** "istanbul", "İSTANBUL", "Istanbul" aynı ile eşleşmeli. "0532 123 45 67", "+90 532 123 45 67", "5321234567" aynı telefona normalize olmalı, "1234" reddedilmeli. Test: Task 9 `trUpper`, Task 11 `normalizeTrPhone`.

---

### Task 1: Proje iskeleti

**Files:**
- Create: `/home/user/satis-paneli/` (create-next-app), `docker-compose.yml`, `.env.example`, `vitest.config.ts`, `playwright.config.ts`, `tests/unit/smoke.test.ts`
- Copy: `/home/user/docs/superpowers/` → `/home/user/satis-paneli/docs/superpowers/`

**Interfaces:**
- Produces: `pnpm dev`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright), `pnpm db:generate`, `pnpm db:migrate`, `pnpm typecheck` script'leri. `src/` altında `@/` import alias'ı.

- [ ] **Step 1:** `pnpm create next-app satis-paneli --ts --tailwind --app --src-dir --import-alias "@/*" --eslint`, sonra `git init`. `tsconfig` içinde `"strict": true` ve `"noUncheckedIndexedAccess": true` olsun.
- [ ] **Step 2:** `docker-compose.yml`: `postgres:16` servisi, port 5432, iki veritabanı: `satis` ve `satis_test` (init script ile). `.env.example`: `DATABASE_URL`, `DATABASE_URL_TEST`, `PANEL_HOST=panel.localhost`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://panel.localhost:3000`.
- [ ] **Step 3:** shadcn/ui init, Vitest (`environment: node`, `tests/unit/**`, `tests/integration/**`), Playwright (`baseURL` yok, testler tam URL kullanır; `webServer: pnpm dev`).
- [ ] **Step 4: Smoke test yaz**

```ts
// tests/unit/smoke.test.ts
import { describe, it, expect } from "vitest";
describe("smoke", () => { it("runs", () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 5:** Run: `pnpm test && pnpm typecheck && pnpm build`. Expected: hepsi başarılı.
- [ ] **Step 6:** Commit: `chore: project skeleton`

---

### Task 2: Veritabanı şeması

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`, `tests/helpers/db.ts`, `tests/integration/schema.test.ts`

**Interfaces:**
- Produces:
  - `db` (Drizzle instance, `src/db/client.ts`), `DATABASE_URL`'den. Testlerde `DATABASE_URL_TEST`.
  - `tests/helpers/db.ts`: `resetDb(): Promise<void>` (bütün tabloları `TRUNCATE ... RESTART IDENTITY CASCADE`), `seedBasic(): Promise<{ domainId, productId, offerIds: { one, two, threeForTwo }, addonOptionIds: { one, two }, siteId }>`.
  - Tablolar ve sütunlar (camelCase TS adı / snake_case DB adı):
    - `domains`: `id`, `name` (unique, küçük harf), `active` (bool, default true), `businessInfo` (jsonb, nullable, domain bazında üzerine yazma), `createdAt`.
    - `settings` (tek satır, `id = 1`): `businessInfo` jsonb, `legalTexts` jsonb, `shippingFeeMinor`, `freeShippingThresholdMinor` (nullable), `shippingVatRate` (default 20), `cookieBannerEnabled` (default false).
    - `products`: `id`, `name`, `sku`, `vatRate`, `costMinor`, `unitPriceMinor` (tekli liste fiyatı), `trackStock` (bool), `stockQty` (int), `codFeeEnabled` (bool), `codFeeCashMinor`, `codFeeCardMinor`, `content` (jsonb, `ProductContent`), `status` (`taslak|aktif|arsiv`), `createdAt`, `updatedAt`.
    - `offers`: `id`, `productId`, `slotKey` (text, sürümler arası aynı paket), `version` (int), `label`, `badge` (nullable), `paidQty`, `freeQty`, `totalPriceMinor`, `freeShipping` (bool), `sortOrder`, `isDefault` (bool), `archivedAt` (nullable). Unique: (`productId`, `slotKey`, `version`).
    - `addons`: `id`, `productId` (ana ürün), `name`, `sku`, `vatRate`, `description`, `archivedAt`.
    - `addonOptions`: `id`, `addonId`, `qty`, `priceMinor`, `label`, `sortOrder`.
    - `sites`: `id`, `domainId`, `subdomain`, `productId`, `status` (`taslak|yayinda|kapali|yonlendir`), `redirectUrl` (nullable), `metaPixelId` (nullable), `metaCapiToken` (nullable), `theme` (jsonb), `contentOverrides` (jsonb, `Partial<ProductContent>`), `priceOverrides` (jsonb, `Record<slotKey, totalPriceMinor>`), `createdAt`. Unique: (`domainId`, `subdomain`).
    - `orders`: `id`, `orderNo` (unique, 10 karakter), `publicToken` (unique, 32 karakter), `idempotencyKey` (unique), `siteId`, `productId`, `offerId`, `status` (Global Constraints'teki değerler), `paymentMethod`, `paymentStatus`, `customerName`, `phone`, `city`, `district`, `address`, `email` (nullable), `subtotalMinor`, `discountMinor`, `shippingMinor`, `codFeeMinor`, `vatTotalMinor`, `grandTotalMinor`, `pricingSnapshot` (jsonb), `pricingEngineVersion`, `policyAcceptedAt`, `ip`, `userAgent`, `utm` (jsonb), `internalNote`, `createdAt`, `updatedAt`.
    - `orderItems`: `id`, `orderId`, `lineType`, `productNameSnapshot`, `skuSnapshot`, `qty`, `unitListPriceMinor`, `unitPriceMinor`, `lineTotalMinor`, `vatRate`, `vatMinor`, `isFree`, `offerId` (nullable), `addonOptionId` (nullable).
    - `orderEvents`: `id`, `orderId`, `type` (`created|status_changed|edited`), `fromStatus`, `toStatus`, `diff` (jsonb), `actorUserId` (nullable), `createdAt`.
    - Better Auth tabloları (`user`, `session`, `account`, `verification`) Better Auth'un Drizzle şemasından. `user` tablosuna `role` (`admin|operator`, default `operator`) eklenir.

- [ ] **Step 1: Failing test yaz**

```ts
// tests/integration/schema.test.ts
import { beforeEach, describe, it, expect } from "vitest";
import { db } from "@/db/client";
import { domains, sites } from "@/db/schema";
import { resetDb, seedBasic } from "../helpers/db";

describe("schema", () => {
  beforeEach(resetDb);
  it("rejects duplicate subdomain on same domain", async () => {
    const s = await seedBasic();
    await expect(
      db.insert(sites).values({ domainId: s.domainId, subdomain: "poset", productId: s.productId, status: "yayinda", theme: {}, contentOverrides: {}, priceOverrides: {} })
    ).rejects.toThrow();
  });
  it("allows same subdomain on different domain", async () => {
    const s = await seedBasic();
    const [d2] = await db.insert(domains).values({ name: "ornek.com" }).returning();
    await db.insert(sites).values({ domainId: d2!.id, subdomain: "poset", productId: s.productId, status: "yayinda", theme: {}, contentOverrides: {}, priceOverrides: {} });
  });
});
```

`seedBasic` şunu kurar: domain `localhost`, ürün "Mini Poşet Kapatıcı" (`unitPriceMinor 39900`, `vatRate 20`), teklifler `one` (slotKey `one`, etiket "1 Adet", 1+0, 39900, kargo ücretli), `two` (slotKey `two`, etiket "2 Adet", 2+0, 59900, kargo ücretsiz, default), `threeForTwo` (slotKey `3al2`, etiket "3 Al 2 Öde", 2+1, 59900, kargo ücretsiz), hepsi `version 1`, ek ürün "Deterjan Hazneli Fırça" seçenekleri `one` (1 adet, 10000) ve `two` (2 adet, 20000), site `poset` (`yayinda`), settings (`shippingFeeMinor 4990`, eşik null).

- [ ] **Step 2:** Run: `pnpm db:generate && pnpm db:migrate && pnpm vitest run tests/integration/schema.test.ts`. Expected: şema yokken FAIL.
- [ ] **Step 3:** `src/db/schema.ts`'yi yukarıdaki tablolarla yaz, migration üret.
- [ ] **Step 4:** Aynı komut. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: database schema`

---

### Task 3: Host çözümleme ve yönlendirme

**Files:**
- Create: `src/tenancy/host.ts`, `src/tenancy/resolve-site.ts`, `src/middleware.ts`, `src/app/_site/[host]/page.tsx` (şimdilik site adını yazan yer tutucu), `tests/unit/host.test.ts`, `tests/integration/resolve-site.test.ts`

**Interfaces:**
- Consumes: `db`, `domains`, `sites`, `products` (Task 2).
- Produces:
  - `normalizeHost(raw: string): string`: küçük harf, port ve sondaki nokta atılır.
  - `type Route = { kind: "panel" } | { kind: "site"; rewrite: string } | { kind: "passthrough" } | { kind: "notfound" }`
  - `routeForRequest(host: string, pathname: string, panelHost: string): Route`
  - `type ResolvedSite = { site: Site; domain: Domain; product: Product }` (Drizzle `$inferSelect` tipleri)
  - `resolveSite(host: string, opts?: { allowDraft?: boolean }): Promise<ResolvedSite | null>`: Host'u en uzun eşleşen domain adına göre böler (`host` = `subdomain + "." + domain.name`). Sadece `yayinda` (veya `allowDraft` ise `taslak`) siteleri ve `active` domainleri döner. `yonlendir` durumundaki site `ResolvedSite` olarak döner, sayfa `redirectUrl`'e yönlendirir.

- [ ] **Step 1: Failing testler yaz**

```ts
// tests/unit/host.test.ts
import { describe, it, expect } from "vitest";
import { normalizeHost, routeForRequest } from "@/tenancy/host";
const P = "panel.localhost";
describe("normalizeHost", () => {
  it("lowercases and strips port", () => expect(normalizeHost("Poset.LocalHost:3000")).toBe("poset.localhost"));
  it("strips trailing dot", () => expect(normalizeHost("poset.localhost.")).toBe("poset.localhost"));
});
describe("routeForRequest", () => {
  it.each([
    ["panel.localhost:3000", "/admin/orders", { kind: "panel" }],
    ["panel.localhost:3000", "/", { kind: "panel" }],
    ["poset.localhost:3000", "/", { kind: "site", rewrite: "/_site/poset.localhost/" }],
    ["poset.localhost:3000", "/tesekkurler", { kind: "site", rewrite: "/_site/poset.localhost/tesekkurler" }],
    ["poset.localhost:3000", "/admin", { kind: "notfound" }],
    ["poset.localhost:3000", "/_site/other.localhost/", { kind: "notfound" }],
    ["poset.localhost:3000", "/api/orders", { kind: "passthrough" }],
    ["poset.localhost:3000", "/_next/static/x.js", { kind: "passthrough" }],
    ["panel.localhost:3000", "/_site/poset.localhost/", { kind: "notfound" }],
  ])("%s %s", (host, path, expected) => expect(routeForRequest(host, path, P)).toEqual(expected));
});
```

```ts
// tests/integration/resolve-site.test.ts
// beforeEach: resetDb + seedBasic
// it("resolves published site") -> resolveSite("poset.localhost") .site.subdomain === "poset"
// it("returns null for unknown subdomain") -> resolveSite("yok.localhost") === null
// it("returns null for closed site") -> status "kapali" iken null
// it("returns null for draft unless allowDraft") -> "taslak" iken null; allowDraft:true iken site
// it("returns null for inactive domain")
// it("picks longest matching domain") -> domains "localhost" ve "a.localhost" varken "x.a.localhost" -> domain "a.localhost", subdomain "x"
```

- [ ] **Step 2:** Run: `pnpm vitest run tests/unit/host.test.ts tests/integration/resolve-site.test.ts`. Expected: FAIL (modüller yok).
- [ ] **Step 3:** `host.ts` ve `resolve-site.ts`'yi yaz. `middleware.ts` `routeForRequest` sonucuna göre: `panel` ise `/`'u `/admin`'e yönlendirir, `site` ise `NextResponse.rewrite`, `notfound` ise 404, `passthrough` ise `next()`. Middleware veritabanına dokunmaz.
- [ ] **Step 4:** Aynı komut. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: host-based routing and site resolution`

---

### Task 4: Fiyat motoru

**Files:**
- Create: `src/lib/money.ts`, `src/pricing/quote.ts`, `tests/unit/money.test.ts`, `tests/unit/quote.test.ts`

**Interfaces:**
- Produces:
  - `vatFromGross(grossMinor: number, ratePct: number): number` = `Math.round(grossMinor * ratePct / (100 + ratePct))`
  - `formatTRY(minor: number): string`: kuruşu yoksa `"599 ₺"`, varsa `"599,90 ₺"`, binlik ayırıcı nokta (`"1.200 ₺"`).
  - `PRICING_ENGINE_VERSION = 1`
  - Tipler:
    ```ts
    type PaymentMethod = "cod_cash" | "cod_card" | "online";
    type LineType = "paid" | "gift" | "addon" | "shipping" | "cod_fee";
    interface QuoteInput {
      product: { name: string; sku: string; vatRate: number; unitPriceMinor: number;
                 codFeeEnabled: boolean; codFeeCashMinor: number; codFeeCardMinor: number };
      offer: { id: number; version: number; slotKey: string; paidQty: number; freeQty: number;
               totalPriceMinor: number; freeShipping: boolean };
      priceOverrideMinor: number | null;          // sites.priceOverrides[slotKey]
      addons: Array<{ optionId: number; name: string; sku: string; vatRate: number; qty: number; priceMinor: number }>;
      paymentMethod: PaymentMethod;
      shipping: { feeMinor: number; freeThresholdMinor: number | null; vatRate: number };
    }
    interface QuoteLine { lineType: LineType; name: string; sku: string; qty: number;
      unitListPriceMinor: number; unitPriceMinor: number; lineTotalMinor: number;
      vatRate: number; vatMinor: number; isFree: boolean; offerId: number | null; addonOptionId: number | null }
    interface Quote { lines: QuoteLine[]; subtotalMinor: number; discountMinor: number; shippingMinor: number;
      codFeeMinor: number; vatTotalMinor: number; grandTotalMinor: number; physicalQty: number;
      packageSavingsMinor: number; engineVersion: number }
    function quote(input: QuoteInput): Quote
    ```
  - Kurallar (spec 10. bölüm):
    - `paid` satırı: `qty = paidQty`, `lineTotal = priceOverrideMinor ?? totalPriceMinor`, `unitPrice = Math.round(lineTotal / paidQty)`, `unitListPrice = product.unitPriceMinor`.
    - `freeQty > 0` ise `gift` satırı: `qty = freeQty`, `unitListPrice = product.unitPriceMinor`, `unitPrice = 0`, `lineTotal = 0`, `isFree = true`.
    - Her ek ürün bir `addon` satırı: `lineTotal = priceMinor`.
    - `subtotal` = paid + addon satırları toplamı.
    - Kargo: `offer.freeShipping` ise 0. Değilse `freeThresholdMinor != null && subtotal >= freeThresholdMinor` ise 0. Değilse `feeMinor`. 0 ise satır eklenmez.
    - Kapıda ödeme bedeli: `codFeeEnabled` ve `cod_cash` ise `codFeeCashMinor`, `cod_card` ise `codFeeCardMinor`, `online` ise 0. 0 ise satır eklenmez. KDV oranı `shipping.vatRate`.
    - `discountMinor` = gift satırlarının `qty * unitListPrice` toplamı.
    - `vatMinor` her satırda `vatFromGross(lineTotal, vatRate)`. `vatTotal` bunların toplamı.
    - `grandTotal = subtotal + shipping + codFee`.
    - `physicalQty = paidQty + freeQty` (ek ürünler hariç).
    - `packageSavingsMinor = max(0, product.unitPriceMinor * (paidQty + freeQty) - paid lineTotal)`.

- [ ] **Step 1: Failing testler yaz**

```ts
// tests/unit/quote.test.ts
import { describe, it, expect } from "vitest";
import { quote, type QuoteInput } from "@/pricing/quote";

const base: QuoteInput = {
  product: { name: "Mini Poşet Kapatıcı", sku: "PK1", vatRate: 20, unitPriceMinor: 39900,
             codFeeEnabled: false, codFeeCashMinor: 0, codFeeCardMinor: 0 },
  offer: { id: 1, version: 1, slotKey: "one", paidQty: 1, freeQty: 0, totalPriceMinor: 39900, freeShipping: false },
  priceOverrideMinor: null, addons: [], paymentMethod: "cod_cash",
  shipping: { feeMinor: 4990, freeThresholdMinor: null, vatRate: 20 },
};
const two = { ...base.offer, id: 2, slotKey: "two", paidQty: 2, totalPriceMinor: 59900, freeShipping: true };
const threeForTwo = { ...base.offer, id: 3, slotKey: "3for2", paidQty: 2, freeQty: 1, totalPriceMinor: 59900, freeShipping: true };
const brush = { optionId: 9, name: "Fırça", sku: "FR1", vatRate: 20, qty: 1, priceMinor: 10000 };

describe("quote", () => {
  it("single unit adds shipping", () => {
    const q = quote(base);
    expect(q.shippingMinor).toBe(4990);
    expect(q.grandTotalMinor).toBe(44890);
    expect(q.lines.map(l => l.lineType)).toEqual(["paid", "shipping"]);
  });
  it("two pack has free shipping", () => {
    const q = quote({ ...base, offer: two });
    expect(q.grandTotalMinor).toBe(59900);
    expect(q.lines.find(l => l.lineType === "shipping")).toBeUndefined();
  });
  it("3 for 2 creates a gift line", () => {
    const q = quote({ ...base, offer: threeForTwo });
    const gift = q.lines.find(l => l.lineType === "gift")!;
    expect(gift).toMatchObject({ qty: 1, unitListPriceMinor: 39900, lineTotalMinor: 0, isFree: true });
    expect(q.discountMinor).toBe(39900);
    expect(q.physicalQty).toBe(3);
    expect(q.grandTotalMinor).toBe(59900);
    expect(q.packageSavingsMinor).toBe(59800);
  });
  it("site price override replaces offer price", () => {
    expect(quote({ ...base, offer: two, priceOverrideMinor: 54900 }).grandTotalMinor).toBe(54900);
  });
  it("threshold counts addons after discount", () => {
    const shipping = { ...base.shipping, freeThresholdMinor: 50000 };
    expect(quote({ ...base, shipping, addons: [brush] }).shippingMinor).toBe(4990);            // 49900
    expect(quote({ ...base, shipping, addons: [{ ...brush, priceMinor: 20000 }] }).shippingMinor).toBe(0); // 59900
  });
  it("cod fee depends on payment method", () => {
    const product = { ...base.product, codFeeEnabled: true, codFeeCashMinor: 1500, codFeeCardMinor: 2500 };
    expect(quote({ ...base, offer: two, product, paymentMethod: "cod_cash" }).codFeeMinor).toBe(1500);
    expect(quote({ ...base, offer: two, product, paymentMethod: "cod_card" }).grandTotalMinor).toBe(62400);
    expect(quote({ ...base, offer: two, product, paymentMethod: "online" }).codFeeMinor).toBe(0);
  });
  it("cod fee disabled adds nothing", () => {
    const product = { ...base.product, codFeeCashMinor: 1500 };
    expect(quote({ ...base, product }).lines.some(l => l.lineType === "cod_fee")).toBe(false);
  });
  it("vat is included per line", () => {
    const q = quote({ ...base, offer: two });
    expect(q.vatTotalMinor).toBe(9983);
  });
  it("is deterministic and does not mutate input", () => {
    const input = structuredClone({ ...base, addons: [brush] });
    const a = quote(input); const b = quote(input);
    expect(a).toEqual(b);
    expect(input).toEqual({ ...base, addons: [brush] });
  });
});
```

`money.test.ts`: `vatFromGross(59900, 20) === 9983`, `vatFromGross(0, 20) === 0`, `formatTRY(59900) === "599 ₺"`, `formatTRY(59990) === "599,90 ₺"`, `formatTRY(120000) === "1.200 ₺"`.

- [ ] **Step 2:** Run: `pnpm vitest run tests/unit/quote.test.ts tests/unit/money.test.ts`. Expected: FAIL.
- [ ] **Step 3:** `money.ts` ve `quote.ts`'yi yaz. `quote.ts` hiçbir modülden veritabanı veya Next import etmez (tarayıcıda da çalışacak).
- [ ] **Step 4:** Aynı komut. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: pricing engine`

---

### Task 5: Panel girişi, roller ve panel kabuğu

**Files:**
- Create: `src/auth/auth.ts`, `src/auth/guard.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/(panel)/layout.tsx`, `src/components/admin/data-table.tsx`, `src/components/admin/form-shell.tsx`, `scripts/seed-admin.ts`, `tests/unit/guard.test.ts`, `tests/e2e/admin-auth.spec.ts`

**Interfaces:**
- Consumes: Better Auth tabloları (Task 2).
- Produces:
  - `auth` (Better Auth instance, e-posta + şifre, `user.role` ek alanı, oturum süresi 12 saat).
  - `type Role = "admin" | "operator"`, `hasRole(userRole: Role, required: Role): boolean` (`admin` her şeyi kapsar).
  - `requireUser(required?: Role): Promise<{ id: string; email: string; role: Role }>`: oturum yoksa `/admin/login`'e `redirect`, yetki yoksa `forbidden()`/403.
  - `DataTable<T>` props: `columns`, `data`, `total`, `page`, `pageSize`, `filters?: ReactNode`, `bulkActions?: ReactNode`. Sayfalama ve sıralama URL query parametreleriyle (`?page=&sort=`).
  - `FormShell` props: `title`, `onSubmit`, `children`, `submitLabel`, `error?: string`.
  - `pnpm seed:admin <email> <password>`: `admin` rolünde kullanıcı oluşturur.
  - Panel menüsü: Siparişler, Ürünler, Siteler, Domainler, Ayarlar.

- [ ] **Step 1: Failing testler yaz**

```ts
// tests/unit/guard.test.ts
import { describe, it, expect } from "vitest";
import { hasRole } from "@/auth/guard";
describe("hasRole", () => {
  it("admin satisfies operator", () => expect(hasRole("admin", "operator")).toBe(true));
  it("operator does not satisfy admin", () => expect(hasRole("operator", "admin")).toBe(false));
  it("operator satisfies operator", () => expect(hasRole("operator", "operator")).toBe(true));
});
```

```ts
// tests/e2e/admin-auth.spec.ts
// test("redirects anonymous user to login"): goto http://panel.localhost:3000/admin/orders -> URL /admin/login
// test("admin can log in"): seed-admin ile kullanıcı, formu doldur -> "Siparişler" başlığı görünür
// test("panel is not reachable from site host"): goto http://poset.localhost:3000/admin/login -> 404
```

- [ ] **Step 2:** Run: `pnpm vitest run tests/unit/guard.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Better Auth kurulumu, guard, login sayfası, panel layout (sol menü), `DataTable`, `FormShell`, seed script.
- [ ] **Step 4:** Run: `pnpm vitest run tests/unit/guard.test.ts && pnpm test:e2e tests/e2e/admin-auth.spec.ts`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: admin auth, roles and panel shell`

---

### Task 6: Domainler ve Ayarlar

**Files:**
- Create: `src/admin/domains/actions.ts`, `src/admin/settings/actions.ts`, `src/admin/validation.ts`, `src/app/admin/(panel)/domains/page.tsx`, `src/app/admin/(panel)/settings/page.tsx`, `tests/unit/validation.test.ts`, `tests/integration/settings.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `DataTable`, `FormShell`, `db`.
- Produces:
  - `DomainNameSchema` (Zod): küçük harfe çevirir, `localhost` veya `^([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$`.
  - `SubdomainSchema` (Zod): `^[a-z0-9](-?[a-z0-9])*$`, 1–63 karakter, rezerve adlar (`panel`, `www`, `api`, `admin`) reddedilir.
  - `BusinessInfoSchema`: `legalName`, `taxNo`, `taxOffice`, `address`, `phone`, `email`, `mersisNo?`.
  - `getSettings(): Promise<Settings>` (satır yoksa varsayılanlarla oluşturur), `updateSettings(input): Promise<Settings>`.
  - Server action'lar: `createDomain`, `updateDomain` (ad değişmez, sadece `active` ve `businessInfo`), `saveSettings`. Hepsi `requireUser("admin")`.

- [ ] **Step 1: Failing testler yaz**

```ts
// tests/unit/validation.test.ts
import { describe, it, expect } from "vitest";
import { DomainNameSchema, SubdomainSchema } from "@/admin/validation";
describe("DomainNameSchema", () => {
  it.each(["localhost", "ornek.com", "Alan.COM.tr"])("accepts %s", v => expect(DomainNameSchema.safeParse(v).success).toBe(true));
  it.each(["", "ornek", "-a.com", "a..com", "http://a.com"])("rejects %s", v => expect(DomainNameSchema.safeParse(v).success).toBe(false));
  it("lowercases", () => expect(DomainNameSchema.parse("Alan.COM")).toBe("alan.com"));
});
describe("SubdomainSchema", () => {
  it.each(["poset", "mt", "masaj-tabancasi", "a1"])("accepts %s", v => expect(SubdomainSchema.safeParse(v).success).toBe(true));
  it.each(["panel", "www", "api", "admin", "-a", "a-", "a_b", "a.b", "ç", "a".repeat(64)])("rejects %s", v => expect(SubdomainSchema.safeParse(v).success).toBe(false));
});
```

`settings.test.ts`: `getSettings()` boş veritabanında `shippingVatRate === 20` ve `cookieBannerEnabled === false` döner; iki kez çağrılınca tek satır olur; `updateSettings({ shippingFeeMinor: 5990 })` sonrası `getSettings().shippingFeeMinor === 5990`.

- [ ] **Step 2:** Run: `pnpm vitest run tests/unit/validation.test.ts tests/integration/settings.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Şemaları, action'ları ve iki sayfayı yaz. Ayarlar sayfası: işletme bilgileri, kargo ücreti, ücretsiz kargo eşiği (boş = yok), kargo KDV oranı. Para girişleri TL olarak alınır, kuruşa çevrilerek kaydedilir (`parseTRYInput("49,90") === 4990`, bu fonksiyon `src/lib/money.ts`'ye eklenir ve testine üç örnek yazılır).
- [ ] **Step 4:** Aynı komut. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: domains and settings admin`

---

### Task 7: Ürünler, içerik, paketler (sürümlü) ve ek ürünler

**Files:**
- Create: `src/content/schema.ts`, `src/admin/products/actions.ts`, `src/admin/offers/actions.ts`, `src/admin/addons/actions.ts`, `src/app/admin/(panel)/products/page.tsx`, `src/app/admin/(panel)/products/[id]/page.tsx`, `src/components/admin/content-editor.tsx`, `tests/unit/content-schema.test.ts`, `tests/integration/offers.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `DataTable`, `FormShell`, `parseTRYInput`, `db`.
- Produces:
  - `ProductContentSchema` (Zod) ve `type ProductContent`. Plan 4'teki yapay zekâ bu şemayı doldurur, bu yüzden alan adları sabittir:
    ```ts
    {
      enabledSections: Array<"announcement"|"marquee"|"hero"|"problems"|"features"|"steps"|"beforeAfter"|"specs"|"comparison"|"useCases"|"faq">;
      announcement?: string;
      marquee: string[];
      hero: { title: string; subtitle: string; imageUrl?: string; videoUrl?: string; ctaLabel: string };
      problems: Array<{ icon: string; title: string; text: string }>;
      features: Array<{ icon: string; title: string; text: string }>;
      steps: Array<{ title: string; text: string }>;
      beforeAfter?: { beforeTitle: string; beforeItems: string[]; afterTitle: string; afterItems: string[] };
      specs: Array<{ label: string; value: string }>;
      comparison?: { ourLabel: string; otherLabel: string; rows: Array<{ label: string; ours: string; other: string }> };
      useCases: Array<{ title: string; text: string }>;
      faq: Array<{ q: string; a: string }>;
      gallery: Array<{ url: string; alt: string }>;
      theme: { primaryColor: string };   // #RRGGBB
    }
    ```
    `emptyProductContent(): ProductContent` geçerli boş bir içerik döner.
  - `createProduct`, `updateProduct` (`content` dahil, şemayla doğrulanır).
  - `saveOffer(productId: number, input: OfferInput): Promise<Offer>`: `slotKey` için aktif sürüm varsa onu `archivedAt = now()` yapar ve `version + 1` ile yeni satır ekler, tek transaction'da. Yoksa `version 1` ile ekler. `isDefault` true ise aynı ürünün diğer aktif tekliflerinde false yapar.
  - `archiveOffer(offerId: number)`.
  - `listActiveOffers(productId: number): Promise<Offer[]>` (`archivedAt IS NULL`, `sortOrder`'a göre).
  - `saveAddon`, `saveAddonOption`, `archiveAddon`, `listActiveAddons(productId)` (seçenekleriyle).
  - Ürün sayfası sekmeleri: Genel (ad, SKU, KDV, maliyet, tekli fiyat, stok takibi ve adet, kapıda ödeme bedeli aç/kapa + nakit/kart tutarı), İçerik (`ContentEditor`, her bölüm için alan ve dizi editörü, bölüm aç/kapa), Paketler, Ek ürünler.

- [ ] **Step 1: Failing testler yaz**

```ts
// tests/unit/content-schema.test.ts
// it("empty content is valid") -> ProductContentSchema.safeParse(emptyProductContent()).success === true
// it("rejects bad color") -> theme.primaryColor "red" reddedilir
// it("rejects unknown section") -> enabledSections ["x"] reddedilir
```

```ts
// tests/integration/offers.test.ts
import { beforeEach, describe, it, expect } from "vitest";
import { resetDb, seedBasic } from "../helpers/db";
import { saveOffer, listActiveOffers } from "@/admin/offers/actions";
// actions içindeki requireUser testte mock'lanır: vi.mock("@/auth/guard", () => ({ requireUser: async () => ({ id: "u", email: "a@a", role: "admin" }) }))

describe("saveOffer", () => {
  beforeEach(resetDb);
  it("editing creates a new version and archives the old one", async () => {
    const s = await seedBasic();
    const v2 = await saveOffer(s.productId, { slotKey: "two", label: "2 Adet", paidQty: 2, freeQty: 0, totalPriceMinor: 64900, freeShipping: true, sortOrder: 2, isDefault: true, badge: null });
    expect(v2.version).toBe(2);
    const active = await listActiveOffers(s.productId);
    expect(active.filter(o => o.slotKey === "two")).toHaveLength(1);
    expect(active.find(o => o.slotKey === "two")!.totalPriceMinor).toBe(64900);
  });
  it("only one default offer per product", async () => {
    const s = await seedBasic();
    await saveOffer(s.productId, { slotKey: "one", label: "1 Adet", paidQty: 1, freeQty: 0, totalPriceMinor: 39900, freeShipping: false, sortOrder: 1, isDefault: true, badge: null });
    const active = await listActiveOffers(s.productId);
    expect(active.filter(o => o.isDefault)).toHaveLength(1);
  });
  it("rejects paidQty < 1 and negative price", async () => {
    const s = await seedBasic();
    await expect(saveOffer(s.productId, { slotKey: "x", label: "x", paidQty: 0, freeQty: 0, totalPriceMinor: 100, freeShipping: false, sortOrder: 9, isDefault: false, badge: null })).rejects.toThrow();
    await expect(saveOffer(s.productId, { slotKey: "x", label: "x", paidQty: 1, freeQty: 0, totalPriceMinor: -1, freeShipping: false, sortOrder: 9, isDefault: false, badge: null })).rejects.toThrow();
  });
});
```

- [ ] **Step 2:** Run: `pnpm vitest run tests/unit/content-schema.test.ts tests/integration/offers.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Şemayı, action'ları ve ürün ekranlarını yaz. Ürün veya teklif kaydı, o ürünün sitelerinin cache etiketlerini temizler (`revalidateTag("product:" + id)`).
- [ ] **Step 4:** Aynı komut. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: products, content, versioned offers and addons`

---

### Task 8: Siteler

**Files:**
- Create: `src/admin/sites/actions.ts`, `src/app/admin/(panel)/sites/page.tsx`, `src/app/admin/(panel)/sites/[id]/page.tsx`, `tests/integration/sites.test.ts`

**Interfaces:**
- Consumes: `SubdomainSchema`, `ProductContentSchema`, `requireUser`, `db`.
- Produces:
  - `createSite(input: { domainId: number; subdomain: string; productId: number }): Promise<Site>` (durum `taslak`).
  - `updateSite(id: number, input: { status?; redirectUrl?; metaPixelId?; metaCapiToken?; theme?; contentOverrides?; priceOverrides? })`. `status = "yonlendir"` ise `redirectUrl` zorunlu (`https://` ile başlayan geçerli URL). `contentOverrides` `ProductContentSchema.partial()` ile doğrulanır. `priceOverrides` anahtarları ürünün aktif teklif `slotKey`'lerinden olmalı.
  - `siteUrl(site, domain): string` = `http://{subdomain}.{domain}:3000` (yerelde) / `https://{subdomain}.{domain}`. Port `PUBLIC_PORT` ortam değişkeninden, boşsa portsuz ve https.
  - Site listesi: adres (tıklanabilir), ürün, durum, pixel var/yok rozeti. Yayına alırken pixel boşsa uyarı gösterilir ama engellenmez.
  - Kaydetme `revalidateTag("site:" + id)` çağırır.
  - Site detayında "Önizle" butonu: `?preview=1` ile taslak site panel oturumu varsa render edilir.

- [ ] **Step 1: Failing testler yaz**

```ts
// tests/integration/sites.test.ts
// it("creates draft site") -> createSite({domainId, subdomain: "mt", productId}).status === "taslak"
// it("rejects duplicate subdomain on same domain with a readable error") -> "poset" tekrar -> Error message "Bu adres zaten kullanılıyor"
// it("rejects reserved subdomain") -> "panel" -> hata
// it("requires redirectUrl for yonlendir") -> updateSite(id,{status:"yonlendir"}) -> hata; redirectUrl "https://x.com" ile başarılı
// it("rejects price override for unknown slot") -> priceOverrides { yok: 100 } -> hata
// it("rejects invalid content override") -> contentOverrides { theme: { primaryColor: "red" } } -> hata
```

- [ ] **Step 2:** Run: `pnpm vitest run tests/integration/sites.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Action'ları ve ekranları yaz. Yeni site formunda domain açılır listeden, subdomain metin kutusundan seçilir ve tam adres canlı önizlenir.
- [ ] **Step 4:** Aynı komut. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: sites admin`

---

### Task 9: İl/ilçe verisi

**Files:**
- Create: `data/tr-il-ilce.json`, `src/geo/tr.ts`, `src/app/api/districts/route.ts`, `tests/unit/geo.test.ts`

**Interfaces:**
- Produces:
  - `data/tr-il-ilce.json` biçimi: `Record<string /* il, büyük harf */, string[] /* ilçeler, büyük harf, alfabetik */>`. Kaynak: açık lisanslı bir il/ilçe veri seti, lisansı ve kaynağı dosyanın yanında `data/README.md`'de yazılı.
  - `trUpper(s: string): string` = `s.trim().toLocaleUpperCase("tr-TR")`, ardından boşlukları teke indirir.
  - `listCities(): string[]` (Türkçe alfabetik), `listDistricts(city: string): string[] | null`, `isValidCityDistrict(city: string, district: string): boolean`. Girdiler `trUpper` ile karşılaştırılır.
  - `GET /api/districts?city=ANKARA` → `200 { districts: string[] }`, bilinmeyen il `404`.

- [ ] **Step 1: Failing testler yaz**

```ts
// tests/unit/geo.test.ts
import { describe, it, expect } from "vitest";
import { listCities, listDistricts, isValidCityDistrict, trUpper } from "@/geo/tr";
describe("geo", () => {
  it("has 81 cities", () => expect(listCities()).toHaveLength(81));
  it("trUpper handles Turkish i", () => {
    expect(trUpper("istanbul")).toBe("İSTANBUL");
    expect(trUpper(" ızmir ")).toBe("IZMIR");
  });
  it("matches city case-insensitively", () => expect(listDistricts("ankara")).toContain("ÇANKAYA"));
  it("validates pairs", () => {
    expect(isValidCityDistrict("İstanbul", "Kadıköy")).toBe(true);
    expect(isValidCityDistrict("ANKARA", "KADIKÖY")).toBe(false);
    expect(isValidCityDistrict("YOK", "X")).toBe(false);
  });
});
```

- [ ] **Step 2:** Run: `pnpm vitest run tests/unit/geo.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Veri dosyasını ekle, modülü ve route'u yaz. Route `Cache-Control: public, max-age=86400` döner.
- [ ] **Step 4:** Aynı komut. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: turkish city and district data`

---

### Task 10: Landing şablonu

**Files:**
- Create: `src/landing/model.ts`, `src/landing/load.ts`, `src/app/_site/[host]/page.tsx` (yer tutucuyu değiştirir), `src/app/_site/[host]/layout.tsx`, `src/components/landing/*.tsx` (her bölüm için bir bileşen), `src/components/landing/order-form.tsx` (client), `tests/unit/landing-model.test.ts`

**Interfaces:**
- Consumes: `resolveSite`, `ProductContentSchema`, `listActiveOffers`, `listActiveAddons`, `getSettings`, `quote`, `formatTRY`, `listCities`.
- Produces:
  - `type LandingOffer = { id: number; version: number; slotKey: string; label: string; badge: string | null; paidQty: number; freeQty: number; priceMinor: number; freeShipping: boolean; isDefault: boolean }` (`priceMinor` site override uygulanmış hâli).
  - `type LandingModel = { siteId: number; host: string; content: ProductContent; offers: LandingOffer[]; addons: Array<{ id; name; description; options: Array<{ id; qty; priceMinor; label }> }>; product: QuoteInput["product"]; shipping: QuoteInput["shipping"]; business: BusinessInfo }`
  - `buildLandingModel(input: { site; domain; product; offers; addons; settings }): LandingModel` (saf): `content` = ürün içeriği üzerine `site.contentOverrides` (üst seviye anahtar bazında; diziler bütün olarak değişir, `hero` ve `theme` alan bazında birleşir). `business` = `domain.businessInfo ?? settings.businessInfo`.
  - `loadLanding(host: string, preview: boolean): Promise<LandingModel | { redirect: string } | null>`: `unstable_cache` ile, etiketler `site:{id}` ve `product:{productId}`.
  - Sayfa: `null` → `notFound()`, `redirect` → `redirect()`. Bölümler `enabledSections` sırasıyla (spec 9. bölüm) render edilir. Ağır kütüphane yok. Görseller `next/image` ile. Mobilde altta sabit "Sipariş ver" butonu forma kaydırır.
  - `OrderForm` (client) props: `model: LandingModel`. Paket seçimi (default teklif seçili), ek ürün seçenekleri (aynı ek üründen tek seçenek), ad, telefon, il, ilçe (`/api/districts`'ten), adres, ödeme türü (`cod_cash` "Kapıda Nakit", `cod_card` "Kapıda Kredi Kartı"), sözleşme onay kutusu, honeypot alanı `website` (görünmez), gizli `idempotencyKey` (sayfa yüklenince `crypto.randomUUID()`). Toplam kutusu `quote()` sonucunu gösterir: satırlar, kargo, kapıda ödeme bedeli, toplam ve paket kazancı ("2'li pakette 300 ₺ kazanırsın"). Gönderim `POST /api/orders` (Task 11). `offer_changed` dönerse "Fiyatlar güncellendi, sayfa yenileniyor" yazar ve sayfayı yeniler. Başarıda `/tesekkurler?t={publicToken}`'a gider.

- [ ] **Step 1: Failing testler yaz**

```ts
// tests/unit/landing-model.test.ts
// it("applies site price override to offer") -> priceOverrides { two: 54900 } -> offers.find(slotKey "two").priceMinor === 54900
// it("overrides hero title but keeps hero subtitle") -> contentOverrides { hero: { title: "Yeni" } } -> content.hero.title "Yeni", subtitle ürünün
// it("replaces arrays wholesale") -> contentOverrides { faq: [{q:"a",a:"b"}] } -> content.faq length 1
// it("uses domain business info when present, else settings")
// it("excludes archived offers") -> girdiye archivedAt dolu teklif verilir, çıktıda yok
```

- [ ] **Step 2:** Run: `pnpm vitest run tests/unit/landing-model.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Modeli, yükleyiciyi, bölüm bileşenlerini ve formu yaz. Tema rengi CSS değişkeni (`--brand`) olarak layout'ta set edilir.
- [ ] **Step 4:** Run: aynı komut + `pnpm build`. Expected: PASS. Elle kontrol: `pnpm dev`, seed verisiyle `http://poset.localhost:3000` açılır, paket değiştirince toplam güncellenir.
- [ ] **Step 5:** Commit: `feat: landing template and order form`

---

### Task 11: Sipariş oluşturma

**Files:**
- Create: `src/orders/phone.ts`, `src/orders/order-no.ts`, `src/orders/create-order.ts`, `src/app/api/orders/route.ts`, `src/app/_site/[host]/tesekkurler/page.tsx`, `tests/unit/phone.test.ts`, `tests/integration/create-order.test.ts`

**Interfaces:**
- Consumes: `resolveSite`, `quote`, `PRICING_ENGINE_VERSION`, `isValidCityDistrict`, `trUpper`, `getSettings`, `db`.
- Produces:
  - `normalizeTrPhone(raw: string): string | null`: rakam dışını atar. 10 hane ve `5` ile başlıyorsa `90` ekler. 11 hane ve `05` ile başlıyorsa baştaki `0`'ı atıp `90` ekler. 12 hane ve `905` ile başlıyorsa olduğu gibi. Diğerleri `null`.
  - `newOrderNo(): string`: 10 karakter, Crockford base32 (`0-9A-HJKMNP-TV-Z`), `crypto.randomBytes` ile. `newPublicToken(): string`: 32 karakter hex.
  - `OrderRequestSchema` (Zod): `idempotencyKey` (uuid), `offerId` (int), `offerVersion` (int), `addonOptionIds` (int[], en fazla 10), `customerName` (2–80), `phone`, `city`, `district`, `address` (10–300), `paymentMethod` (`cod_cash|cod_card`; `online` bu planda reddedilir), `policyAccepted` (`true` literal), `website` (honeypot, boş olmalı), `utm` (opsiyonel, `Record<string,string>`, en fazla 10 anahtar).
  - `type CreateOrderResult = { ok: true; orderNo: string; publicToken: string } | { ok: false; code: "validation"; fieldErrors: Record<string, string> } | { ok: false; code: "not_found" | "offer_changed" | "spam" }`
  - `createOrder(host: string, body: unknown, meta: { ip: string; userAgent: string }): Promise<CreateOrderResult>`:
    1. Site çözülmezse `not_found`.
    2. Şema doğrulaması, `normalizeTrPhone`, `isValidCityDistrict` başarısızsa `validation` (alan bazında Türkçe mesaj).
    3. `website` doluysa `spam` (sipariş oluşmaz, route yine 200 döner ama başarı sayfası yerine genel mesaj).
    4. Aynı `idempotencyKey` ile sipariş varsa onun `orderNo`/`publicToken`'ı döner.
    5. Teklif: `offerId` sitenin ürününe ait ve `archivedAt IS NULL` ve `version === offerVersion` değilse `offer_changed`.
    6. Ek ürün seçenekleri: hepsi sitenin ürününe bağlı aktif ek ürünlere ait değilse `validation`. Aynı ek üründen birden fazla seçenek `validation`.
    7. `quote()` çalışır. Tek transaction'da `orders` (`status: "yeni"`, `paymentStatus: "tahsil_bekliyor"`, `city`/`district` `trUpper` ile, `pricingSnapshot` = `{ input, quote }`), `orderItems` (her quote satırı) ve `orderEvents` (`created`) yazılır. `idempotencyKey` unique ihlalinde (yarış) mevcut sipariş okunup döner.
  - `POST /api/orders`: Host'u `normalizeHost` ile, IP'yi `x-forwarded-for`'un ilk değerinden alır. `ok:true` → 201, `validation` → 422, `offer_changed` → 409, `not_found` → 404, `spam` → 200 `{ ok: true }` gövdesiz token.
  - Teşekkür sayfası `/tesekkurler?t=` : token geçersizse 404. Sipariş no, kalemler, toplam, ödeme türü ve "Siparişiniz alındı" mesajı.

- [ ] **Step 1: Failing testler yaz**

```ts
// tests/unit/phone.test.ts
import { describe, it, expect } from "vitest";
import { normalizeTrPhone } from "@/orders/phone";
describe("normalizeTrPhone", () => {
  it.each([["5321234567"], ["05321234567"], ["0532 123 45 67"], ["+90 532 123 45 67"], ["905321234567"], ["(532) 123-45-67"]])
    ("%s", raw => expect(normalizeTrPhone(raw)).toBe("905321234567"));
  it.each([["1234"], ["4321234567"], ["053212345678"], [""], ["abc"]])("rejects %s", raw => expect(normalizeTrPhone(raw)).toBeNull());
});
```

```ts
// tests/integration/create-order.test.ts
import { beforeEach, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resetDb, seedBasic } from "../helpers/db";
import { createOrder } from "@/orders/create-order";

const meta = { ip: "1.2.3.4", userAgent: "test" };
const body = (s: Awaited<ReturnType<typeof seedBasic>>, over: Record<string, unknown> = {}) => ({
  idempotencyKey: randomUUID(), offerId: s.offerIds.threeForTwo, offerVersion: 1, addonOptionIds: [s.addonOptionIds.one],
  customerName: "Ayşe Yılmaz", phone: "0532 123 45 67", city: "istanbul", district: "kadıköy",
  address: "Moda Mah. Örnek Sok. No 1 D 2", paymentMethod: "cod_cash", policyAccepted: true, website: "", ...over,
});

describe("createOrder", () => {
  beforeEach(resetDb);
  it("creates order with server-side price and gift line", async () => {
    const s = await seedBasic();
    const r = await createOrder("poset.localhost", body(s), meta);
    expect(r.ok).toBe(true);
    const [o] = await db.select().from(orders);
    expect(o).toMatchObject({ status: "yeni", paymentStatus: "tahsil_bekliyor", phone: "905321234567", city: "İSTANBUL", district: "KADIKÖY", grandTotalMinor: 69900 });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o!.id));
    expect(items.map(i => i.lineType).sort()).toEqual(["addon", "gift", "paid"]);
  });
  it("ignores any price sent by the client", async () => {
    const s = await seedBasic();
    await createOrder("poset.localhost", body(s, { grandTotalMinor: 1, totalPriceMinor: 1 }), meta);
    const [o] = await db.select().from(orders);
    expect(o!.grandTotalMinor).toBe(69900);
  });
  it("same idempotency key returns same order", async () => {
    const s = await seedBasic(); const b = body(s);
    const [a, c] = await Promise.all([createOrder("poset.localhost", b, meta), createOrder("poset.localhost", b, meta)]);
    expect(a).toEqual(c);
    expect(await db.select().from(orders)).toHaveLength(1);
  });
  it("rejects archived offer with offer_changed", async () => {
    const s = await seedBasic();
    // offers.archivedAt = now() for threeForTwo
    // expect(await createOrder(...)).toEqual({ ok: false, code: "offer_changed" })
  });
  it("rejects offer from another product", async () => {
    // ikinci ürün + teklif oluştur, onun offerId'si ile gönder -> offer_changed, sipariş yok
  });
  it("rejects addon from another product", async () => {
    // ikinci ürünün addon option'ı -> code "validation", sipariş yok
  });
  it("rejects invalid phone and district with field errors", async () => {
    // phone "1234" ve district "ÇANKAYA" (İstanbul ile) -> code "validation", fieldErrors.phone ve fieldErrors.district dolu
  });
  it("honeypot filled creates nothing", async () => {
    // website: "x" -> { ok:false, code:"spam" }, orders boş
  });
  it("unknown or closed site returns not_found", async () => {
    // "yok.localhost" -> not_found; site status "kapali" -> not_found
  });
  it("rejects online payment in this phase", async () => {
    // paymentMethod "online" -> code "validation"
  });
});
```

- [ ] **Step 2:** Run: `pnpm vitest run tests/unit/phone.test.ts tests/integration/create-order.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Modülleri, route'u ve teşekkür sayfasını yaz.
- [ ] **Step 4:** Aynı komut. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: order creation`

---

### Task 12: Sipariş paneli

**Files:**
- Create: `src/orders/status.ts`, `src/admin/orders/queries.ts`, `src/admin/orders/actions.ts`, `src/app/admin/(panel)/orders/page.tsx`, `src/app/admin/(panel)/orders/[id]/page.tsx`, `src/app/admin/(panel)/orders/export/route.ts`, `tests/unit/status.test.ts`, `tests/integration/order-admin.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `hasRole`, `DataTable`, `db`, `formatTRY`.
- Produces:
  - `ORDER_STATUSES` (Global Constraints sırası), `ORDER_STATUS_LABELS` (Türkçe: "Doğrulama bekliyor", "Doğrulanmadı", "Yeni", "Onaylandı", "Kargoda", "Teslim edildi", "İptal", "İade").
  - `canTransition(from: OrderStatus, to: OrderStatus): boolean`. İzinli geçişler:
    - `dogrulama_bekliyor` → `yeni`, `dogrulanmadi`, `iptal`
    - `dogrulanmadi` → `yeni`, `iptal`
    - `yeni` → `onaylandi`, `iptal`
    - `onaylandi` → `kargoda`, `iptal`
    - `kargoda` → `teslim_edildi`, `iade`, `iptal`
    - `teslim_edildi` → `iade`
    - `iptal`, `iade` → hiçbir yere
  - `type OrderFilters = { siteId?; productId?; status?; paymentMethod?; from?: Date; to?: Date; q?: string /* ad, telefon veya sipariş no */ ; page: number; pageSize: number }`
  - `listOrders(f: OrderFilters): Promise<{ rows: OrderRow[]; total: number }>` (en yeni üstte; `OrderRow` site adresi ve ürün adını içerir).
  - `changeStatus(orderIds: number[], to: OrderStatus): Promise<{ changed: number[]; skipped: Array<{ id: number; reason: string }> }>`: her sipariş için `canTransition` kontrolü, `orderEvents` (`status_changed`) yazar. `requireUser("operator")`.
  - `editOrder(id: number, patch: unknown): Promise<Order>`: sadece `customerName`, `city`, `district`, `address`, `internalNote` kabul eder (Zod `.strict()`), il/ilçe doğrulanır, değişiklik `orderEvents` (`edited`, `diff`) olarak yazılır. Başka alan gelirse hata.
  - `GET /admin/orders/export?…filters` → CSV (UTF-8 BOM, `;` ayraç), sadece `admin`. Sütunlar: sipariş no, tarih, site, ürün, paket, ek ürünler, müşteri, telefon, il, ilçe, adres, ödeme türü, toplam (TL), durum.
  - Liste ekranı: filtreler, arama, satır seçimi + toplu durum değiştirme. Detay ekranı: müşteri bilgileri (düzenlenebilir), kalemler, fiyat kopyası (açılır JSON), geçmiş (`orderEvents`), durum butonları (sadece izinli geçişler).

- [ ] **Step 1: Failing testler yaz**

```ts
// tests/unit/status.test.ts
import { describe, it, expect } from "vitest";
import { canTransition } from "@/orders/status";
describe("canTransition", () => {
  it.each([
    ["yeni", "onaylandi", true], ["yeni", "kargoda", false], ["onaylandi", "kargoda", true],
    ["kargoda", "teslim_edildi", true], ["kargoda", "iade", true], ["teslim_edildi", "iade", true],
    ["teslim_edildi", "iptal", false], ["iptal", "yeni", false], ["iade", "kargoda", false],
    ["dogrulama_bekliyor", "yeni", true], ["dogrulanmadi", "yeni", true], ["yeni", "yeni", false],
  ] as const)("%s -> %s = %s", (from, to, ok) => expect(canTransition(from, to)).toBe(ok));
});
```

```ts
// tests/integration/order-admin.test.ts
// it("bulk change skips invalid transitions") -> iki sipariş (yeni, kargoda) -> changeStatus([a,b], "onaylandi") -> changed [a], skipped [b]; orderEvents 1 satır
// it("operator can edit address") -> editOrder(id,{address:"Yeni adres 12345"}) -> adres değişti, orderEvents "edited" diff içerir
// it("operator cannot edit price or offer") -> editOrder(id,{grandTotalMinor:1}) -> hata; editOrder(id,{offerId:2}) -> hata
// it("edit validates city/district") -> {city:"ANKARA", district:"KADIKÖY"} -> hata
// it("listOrders filters by site and searches phone") -> iki sitede sipariş, siteId filtresi 1 döner; q:"5321234567" eşleşir
// it("export is forbidden for operator") -> operator oturumuyla route 403
```

- [ ] **Step 2:** Run: `pnpm vitest run tests/unit/status.test.ts tests/integration/order-admin.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Modülleri ve ekranları yaz. Panelde fiyat alanları salt okunur gösterilir.
- [ ] **Step 4:** Aynı komut. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: order management panel`

---

### Task 13: Uçtan uca test ve yerel kurulum belgesi

**Files:**
- Create: `scripts/seed-demo.ts`, `tests/e2e/order-flow.spec.ts`, `README.md`

**Interfaces:**
- Consumes: her şey.
- Produces:
  - `pnpm seed:demo`: `seedBasic` ile aynı veriyi geliştirme veritabanına kurar (domain `localhost`, ürün, 3 paket, ek ürün, site `poset` yayında, örnek içerik dolu).
  - README: gereksinimler (Node 22, pnpm, Docker), `docker compose up -d`, `.env` kopyalama, `pnpm db:migrate`, `pnpm seed:admin`, `pnpm seed:demo`, `pnpm dev`, adresler (`http://panel.localhost:3000`, `http://poset.localhost:3000`), test komutları.

- [ ] **Step 1: Failing E2E testi yaz**

```ts
// tests/e2e/order-flow.spec.ts
import { test, expect } from "@playwright/test";
test("customer orders on subdomain and order shows in panel", async ({ page }) => {
  await page.goto("http://poset.localhost:3000/");
  await page.getByLabel("3 Al 2 Öde").check();
  await expect(page.getByTestId("order-total")).toHaveText("599 ₺");
  await page.getByLabel("Ad Soyad").fill("Ayşe Yılmaz");
  await page.getByLabel("Telefon").fill("5321234567");
  await page.getByLabel("İl").selectOption("İSTANBUL");
  await page.getByLabel("İlçe").selectOption("KADIKÖY");
  await page.getByLabel("Adres").fill("Moda Mah. Örnek Sok. No 1");
  await page.getByLabel(/sözleşme/i).check();
  await page.getByRole("button", { name: /siparişi tamamla/i }).click();
  await expect(page.getByText("Siparişiniz alındı")).toBeVisible();
  const orderNo = await page.getByTestId("order-no").innerText();

  await page.goto("http://panel.localhost:3000/admin/login");
  // seed-admin kullanıcısıyla giriş
  await page.goto("http://panel.localhost:3000/admin/orders");
  await expect(page.getByText(orderNo)).toBeVisible();
});
test("unknown subdomain is 404", async ({ page }) => {
  const res = await page.goto("http://yok.localhost:3000/");
  expect(res?.status()).toBe(404);
});
```

- [ ] **Step 2:** Run: `pnpm seed:demo && pnpm test:e2e tests/e2e/order-flow.spec.ts`. Expected: eksik `data-testid`/etiket varsa FAIL.
- [ ] **Step 3:** Eksik etiketleri ve test kimliklerini ekle, demo seed ve README'yi yaz.
- [ ] **Step 4:** Run: `pnpm test && pnpm typecheck && pnpm test:e2e`. Expected: hepsi PASS.
- [ ] **Step 5:** Commit: `test: end-to-end order flow and local setup docs`
