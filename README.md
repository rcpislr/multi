# Satış Paneli

Tek yönetim panelinden yönetilen, her ürünün kendi subdomain'inde yayınlandığı kapıda ödemeli satış sistemi.

- Tasarım: `docs/superpowers/specs/2026-10-31-coklu-subdomain-siparis-sistemi-design.md`
- Plan 1 (bu sürüm): `docs/superpowers/plans/2026-10-31-plan-1-cekirdek.md`

## Gereksinimler

- Node 22, pnpm 10
- PostgreSQL 16, bilgisayara doğrudan kurulu (Docker kullanılmaz)

## PostgreSQL kurulumu

macOS (Homebrew):

```bash
brew install postgresql@16 && brew services start postgresql@16
```

Ubuntu / Debian:

```bash
sudo apt install postgresql-16 && sudo systemctl enable --now postgresql
```

Windows: https://www.postgresql.org/download/windows/ adresindeki kurulum sihirbazıyla PostgreSQL 16 kurun; servis otomatik başlar.

İki veritabanı oluşturun (kullanıcı adı ve şifreyi `.env` içindeki `DATABASE_URL` / `DATABASE_URL_TEST` ile aynı yapın):

```bash
createdb satis && createdb satis_test
```

## Kurulum

```bash
cp .env.example .env
```

`.env` içinde `BETTER_AUTH_SECRET` değerini uzun, rastgele bir metinle değiştirin.

```bash
pnpm install
```

```bash
pnpm db:migrate && pnpm db:migrate:test
```

```bash
pnpm seed:admin admin@ornek.com guclu-bir-sifre admin
```

```bash
pnpm seed:demo
```

```bash
pnpm dev
```

## Adresler

| Adres | Ne |
|---|---|
| http://panel.localhost:3000 | Yönetim paneli |
| http://poset.localhost:3000 | Demo ürün sayfası |

`*.localhost` adresleri tarayıcılarda ek DNS ayarı olmadan bilgisayarınıza yönlenir.
Yeni bir site açmak için panelde **Siteler → Yeni site** ekranından domain ve subdomain seçin.

## Testler

```bash
pnpm test
```

```bash
pnpm test:e2e
```

Birim ve entegrasyon testleri `satis_test` veritabanını kullanır (`DATABASE_URL_TEST`).
Uçtan uca testler geliştirme sunucusuna (`pnpm dev`) ve geliştirme veritabanına bağlanır; önce `pnpm seed:demo` çalıştırın.

## Yapı

| Klasör | İçerik |
|---|---|
| `src/proxy.ts`, `src/tenancy/` | Host başlığına göre panel / site yönlendirmesi |
| `src/pricing/quote.ts` | Saf fiyat motoru (sayfada ve sunucuda aynı hesap) |
| `src/orders/` | Sipariş oluşturma, telefon normalizasyonu, durum geçişleri |
| `src/admin/` | Panel veri katmanı (`store.ts`) ve sunucu aksiyonları (`actions.ts`) |
| `src/app/%5Fsite/[host]/` | Landing şablonu ve teşekkür sayfası |
| `src/app/admin/` | Yönetim paneli ekranları |
| `data/tr-il-ilce.json` | İl / ilçe listesi |
