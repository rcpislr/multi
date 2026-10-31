# Satışa Hazır Yol Haritası

Tarih: 2026-10-31 · Kaynak: Plan 1 kodunu okuyan dört uzman incelemesi (yapay zekâ + landing, sipariş operasyonu, Meta ölçümü, güvenlik + canlıya çıkış), tasarım dokümanı (`2026-10-31-coklu-subdomain-siparis-sistemi-design.md`).

Öncelik: **P0** = satışa çıkmadan şart · **P1** = ilk hafta · **P2** = sonra. Büyüklük: S / M / L.

## Durum

Plan 1 tamam (PR rcpislr/multi#1): subdomain yönlendirme, panel, ürün/paket/ek ürün/site yönetimi, fiyat motoru, landing şablonu, kapıda ödemeli sipariş, sipariş paneli. Son incelemenin 18 bulgusunun tamamı kapatıldı.

## Plan 2 — Sipariş güvenliği ve operasyon (P0)

| # | İş | Öncelik | Büyüklük |
|---|---|---|---|
| 2.1 | Arka plan iş kuyruğu (pg-boss) ve ayrı worker süreci; `notifications` tablosu | P0 | M |
| 2.2 | OTP: sipariş `dogrulama_bekliyor` başlar; `order_otps` (hash'li kod, deneme, süre); `/api/orders/[token]/otp/verify` ve `/resend`; 6 hane, 3 dk, 5 deneme, 60 sn yeniden gönderim, sipariş başına 3 gönderim | P0 | L |
| 2.3 | `OtpProvider` arayüzü: `netgsm` (WhatsApp, iletilemezse SMS) ve `fake` (yerelde kod panelde görünür) | P0 | M |
| 2.4 | Durum makinesi düzeltmeleri: `dogrulama_bekliyor → yeni` sadece OTP ile; elle onay yalnızca `dogrulanmadi → yeni`, admin + not zorunlu; `kargoda → iptal` yerine yeni `teslim_edilemedi`; durum değişince `paymentStatus` da güncellenir | P0 | S |
| 2.5 | Stok hareketleri: `stock_movements` (tekil `order+reason`), atomik düşüm (ücretli + hediye adet), iptal/doğrulanmadı → otomatik iade, kargodan dönen → operatör "depoya döndü" | P0 | M |
| 2.6 | Hız sınırı (PostgreSQL sayaç tablosu): IP başına sipariş, telefon başına sipariş, OTP gönderim/doğrulama | P0 | M |
| 2.7 | Honeypot en başta + formun "çok hızlı gönderildi" kontrolü (imzalı zaman damgası) | P1 | S |
| 2.8 | Risk skoru + mükerrer işaretleme (aynı telefon 48 saat, geçmiş iade/teslim edilemedi, kısa adres) ve kara liste | P1 | M |
| 2.9 | Telegram yeni sipariş bildirimi (telefon maskeli) | P0 | S |
| 2.10 | Operatör iş akışı: durum sekmeleri ve sayaçlar, `kargoda`'ya geçerken takip no zorunlu, genişletilmiş arama (telefonun son 4 hanesi, il/ilçe) | P0 | M |
| 2.11 | Kargo Excel'i dışa aktarma, takip numarası içe aktarma, A6 yazdırılabilir etiket | P1 | M |
| 2.12 | `shipments` tablosu ve kargo firması adaptör arayüzü; kapıda tahsilat mutabakatı | P1 | M |
| 2.13 | WhatsApp şablonları: sipariş onayı, kargoya verildi | P1 | M |
| 2.14 | Panel için iki adımlı giriş (TOTP), denetim logu (girişler, admin işlemleri, CSV) | P0 | M |

## Plan 3 — Ölçüm, Meta ve test paneli

| # | İş | Öncelik | Büyüklük |
|---|---|---|---|
| 3.1 | Teşekkür sayfası token'ı URL'den çıkar: HttpOnly çerez; panelde CAPI anahtarı geri basılmasın, veritabanında şifreli | P0 | S |
| 3.2 | Atıf çerezi (`fbclid`, `utm_*`, `campaign_id/adset_id/ad_id`) ve `order_attribution` tablosu; `_fbp`/`_fbc` sunucuda okunur | P0 | M |
| 3.3 | Meta Pixel bileşeni: PageView, ViewContent, InitiateCheckout (form), Purchase (OTP sonrası, teşekkür sayfası); önizlemede pixel yok | P0 | M |
| 3.4 | CAPI outbox (`meta_events`), worker ile gönderim, üstel yeniden deneme, `event_id` ile tekilleştirme, hash'li kullanıcı verisi, site bazında test kodu | P0 | M |
| 3.5 | Ziyaret sayacı (`sendBeacon`, bot filtresi) ve günlük site istatistikleri | P0 | M |
| 3.6 | Test paneli: site × kampanya kırılımında ziyaret, dönüşüm, AOV, paket dağılımı, ek ürün oranı, OTP doğrulama oranı | P0 | M |
| 3.7 | Reklam harcaması (elle + Ads Manager CSV), maliyet kopyası, kâr, CPO, başabaş CPO, teslim oranı, "durdur / izle / ölçekle" göstergesi | P1 | M |
| 3.8 | Teslimde özel CAPI olayı (gerçek tahsilat) | P2 | S |
| 3.9 | Gerçek veriye bağlı aciliyet: teklif başlangıç/bitiş + geri sayım, canlı sipariş bildirimi (sadece doğrulanmış siparişler), stok göstergesi | P1 | M |
| 3.10 | Yasal sayfalar (mesafeli satış, ön bilgilendirme, iade/cayma, KVKK aydınlatma, çerez), formda linkli ve boş gelen onay kutusu, çerez bandı (açık/kapalı) | P0 | M |

## Plan 4 — Yapay zekâ ile ürün sayfası üretimi (her ürün böyle oluşturulacak)

| # | İş | Öncelik | Büyüklük |
|---|---|---|---|
| 4.1 | Medya: yükleme, `sharp` ile EXIF/GPS silme, WebP 480/828/1200 px, boyutlar, `media` tablosu; landing'de `srcset`, genişlik/yükseklik | P0 | M |
| 4.2 | Şema genişletme: `contentVersion`, bölüm görselleri (`imageId`), `hero.posterUrl`, `seo`, galeri bölüm listesine; güven rozetleri ayarlardan türetilir (yapay zekâ yazmaz) | P0 | S |
| 4.3 | Sihirbaz: ürün bilgileri (vaat, hedef kitle, sorun, fark, teknik bilgiler, "söylenmeyecekler") → medya → üretim (kuyrukta) → gözden geçir → taslak | P0 | L |
| 4.4 | Claude çağrısı: tek araç (`fill_product_content`), şemaya zorlanmış çıktı, doğrulama başarısızsa bir kez düzeltme, görseller URL değil kimlikle | P0 | M |
| 4.5 | Bölüm bazında yeniden üretme (talimatla), eski/yeni yan yana | P0 | M |
| 4.6 | Politika katmanı: yasaklı iddialar (tedavi eder, %100, garantili…), girdide olmayan rakamlar uyarı; uyarılar yayını engeller | P0 | M |
| 4.7 | Tema rengi kontrast kontrolü (beyaz metin ≥ 4.5:1) | P0 | S |
| 4.8 | Üretim logu ve maliyet (`ai_generations`) | P0 | S |
| 4.9 | Gerçek yorumlar: panelden giriş + teslimden sonra WhatsApp ile yorum linki; yapay zekâ seçer ve özetler, yorum yazmaz | P1 | M |
| 4.10 | Landing iyileştirmeleri: güven bandı, telefon maskesi, ilk hatalı alana kaydırma, sabit butonda fiyat, hero'da başlangıç fiyatı, WhatsApp iletişim butonu | P0–P1 | M |

## Plan 5 — Canlıya çıkış (P0)

| # | İş | Öncelik | Büyüklük |
|---|---|---|---|
| 5.1 | Ortam değişkeni doğrulaması (`src/env.ts`), ayrı `PREVIEW_SECRET` ve süreli/iptal edilebilir önizleme linki, `DATA_ENCRYPTION_KEY` | P0 | S |
| 5.2 | Docker yok **[Kullanıcı]**: `next build` (standalone), PM2 ile `web` ve `worker` süreçleri (ecosystem dosyası, otomatik yeniden başlatma, log döndürme), sisteme kurulu PostgreSQL (dışarıya kapalı), deploy betiği: `git pull → pnpm install → db:migrate → build → pm2 reload` | P0 | M |
| 5.3 | TLS: Cloudflare wildcard + origin sertifikası (kendi domainlerin için) | P0 | M |
| 5.4 | Yedek: gece `pg_dump` şifreli, sunucu dışına; geri yükleme betiği ve runbook | P0 | M |
| 5.5 | GitHub Actions CI: typecheck, lint, test, e2e (runner üzerinde PostgreSQL kurulumu, Docker yok) | P0 | M |
| 5.6 | Sağlık uç noktası, JSON log, hata izleme (Sentry), uptime | P1 | M |
| 5.7 | Veritabanı indeksleri, domain eşleşmesini indeksli sorguya çevirme, havuz ayarı | P1 | S |
| 5.8 | KVKK saklama/anonimleştirme işi ve panelde "müşteri verisini sil" | P1 | M |
| 5.9 | SaaS'a hazırlık: `accounts` tablosu ve tüm tablolara `account_id` (tek varsayılan hesapla) | P1 | M |

## Önerilen sıra

Plan 2 → Plan 4 → Plan 3 → Plan 5. Plan 2 ve 4 satışın kendisi (sahte siparişi önlemek, ürün sayfasını üretmek); Plan 3 reklam optimizasyonu; Plan 5 sunucuya kurulum. Plan 5'in CI kısmı (5.5) en başta yapılabilir.

## Kullanıcıdan gerekenler

| Konu | Neden | Gerektiği plan |
|---|---|---|
| NetGSM: kullanıcı kodu/şifre (veya API anahtarı), SMS başlığı, WhatsApp onay şablonunun durumu, teslim raporu webhook'u | OTP gerçek gönderim | Plan 2 (yerelde sahte sağlayıcıyla geliştirilir) |
| Telegram bot token ve sohbet kimliği | Yeni sipariş bildirimi | Plan 2 |
| Kargo firması ve anlaşma (desi/kg, kapıda kart tahsilatı var mı) | Excel şablonu, etiket, mutabakat | Plan 2 |
| Claude API anahtarı ve bütçe | Ürün sayfası üretimi | Plan 4 |
| Kargo süresi / kesim saati, iade ve garanti politikası | Güven rozetleri ve yasal metinler | Plan 3–4 |
| Yasal metinler (avukat onaylı) ve işletme bilgileri | Yasal sayfalar, PayTR başvurusu | Plan 3 |
| Sunucu (VPS) ve ana domainler, Cloudflare hesabı | Canlıya çıkış | Plan 5 |
| Meta: Purchase değeri brüt mü; çerez onayı reddedilirse CAPI gitsin mi; harcama site düzeyinde mi reklam düzeyinde mi | Ölçüm | Plan 3 |
| Operatörler için 2FA zorunlu mu; operatör kargo Excel'i alabilsin mi | Yetki | Plan 2 |
