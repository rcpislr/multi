# Çok Subdomainli Landing + Tek Panel Sipariş Sistemi — Tasarım

Tarih: 2026-10-31 · Durum: kullanıcı tarafından onaylandı (2026-10-31)
Ek kaynak: `/home/user/rapor-coklu-subdomain-siparis-sistemi.md` (ön araştırma raporu)

İşaretler: **[Kullanıcı]** = kullanıcının kendi kararı. **[Öneri]** = benim kararım/önerim, kullanıcı itiraz etmedi ama açıkça onaylamadı.

## 1. Amaç ve neden

Kullanıcı kendi ürünlerini Türkiye'de Meta (Facebook/Instagram) reklamlarıyla satacak. Ürünleri test ederek ilerleyecek: bir ürünü farklı subdomain'lerde, farklı reklam kurgularıyla yayınlayıp hangisinin sattığına bakacak. Tüm subdomain'lerden gelen siparişler tek bir panelde yönetilecek. **[Kullanıcı]**

Şu an için amaç kullanıcının kendi finansal kazancı. İleride sistemi başkalarına satma (SaaS) ihtimali var. Bu yüzden mimari buna kapı kapatmamalı, ama ilk sürüm tek kullanıcılı (tek işletme) olacak. **[Kullanıcı]**

Referans model: `posetkapat.indirimbey.com` ve `mt.indirimbey.com`. İkisinde de sipariş formu ortak (aynı alanlar, aynı arka uç, il/ilçe seçimi, 1/2/3'lü paketler, ek ürünler). Tanıtım içeriği ürüne göre değişiyor ve her sitenin kendi Meta pixel'i var.

## 2. Hedefler

1. Tek yönetim paneli (CMS gibi). Buradan ürün, site, kampanya ve sipariş yönetilecek. **[Kullanıcı]**
2. Birden fazla ana domain panelden eklenebilecek. Ürün/site eklerken ana domain seçilip subdomain adı girilecek, site o adreste hemen yayına girecek. **[Kullanıcı]**
3. Tek bir ürün sayfası şablonu olacak. Panelde girilen içerik bu şablonu dolduracak. **[Kullanıcı]**
4. Her ürün sayfası aynı şablonu kullanacak. Yeni ürün yapay zekâ ile oluşturulacak: şablon alanlarını yapay zekâ dolduracak. Tasarım yapmayacak, sadece içerik üretecek. **[Kullanıcı]**
5. Ürün bazında stok takibi açılıp kapatılabilecek. **[Kullanıcı]**
6. Kampanyalı satış olacak: 1/2/3'lü paket fiyatları, "1 alana 1 bedava", "3 alana 2 bedava", ek ürün, ücretsiz kargo eşiği. **[Kullanıcı]**
7. Ödeme: kapıda nakit, kapıda kredi kartı, online kart (PayTR). **[Kullanıcı]**
8. Aciliyet ve teşvik hissi güçlü olacak. **[Kullanıcı]**
9. Kargo ve e-fatura entegrasyonları sonra eklenecek, veri modeli bunlara hazır olmalı. **[Kullanıcı]**

## 3. Hedef dışı (ilk sürümde yok)

- Çok müşterili SaaS (her müşterinin kendi hesabı, faturalandırma). Sadece veri modelinde `account` kavramına yer bırakılır.
- Müşteri üyeliği, sepet, çok ürünlü alışveriş. Her landing tek ürün satar. Ek ürünler sipariş formunun içinde eklenir.
- Kargo ve e-fatura entegrasyonları (sadece alanlar ve durumlar hazırlanır).
- Kupon kodları ve kampanyaların birbirine eklenmesi (stacking).
- Mobil uygulama.
- Birden fazla şablon (tek şablon var, renk/tema ayarları dışında).

## 4. Olmaması gerekenler (anti-goals)

Sistem teknik olarak çalışsa bile şunlar olursa başarısız sayılır:

- Ekranda görünen fiyat ile tahsil edilen fiyatın farklı olması. Rakip sitede bu sorun vardı (ekranda 399 ₺, arka planda 449 ₺).
- Landing sayfasının mobilde yavaş açılması. Reklam trafiğinin tamamı mobil.
- Bir sipariş kaybolursa (form gönderildi ama panele düşmedi).
- Aynı ödemenin iki kez sayılması, ya da stoğun iki kez düşmesi.
- Uydurma aciliyet ve sosyal kanıt. Bunları ben kurmayacağım: her ziyaretçide sıfırlanan sayaç, uydurma satış sayısı, hiç satılmamış "eski fiyat". Gerekçesi Meta reklam hesabı, PayTR mağaza onayı ve tüketiciyi yanıltma riski. Aciliyetin gerçek veriyle nasıl sağlanacağı 9. bölümde. **[Öneri]**

## 5. Kısıtlar

- Ekip yok. Kodu Claude yazacak, kullanıcı yönetecek.
- Türkiye pazarı: fiyatlar KDV dahil TL, il/ilçe listesi, telefon formatı 5XX XXX XX XX.
- Meta reklamı: her site kendi pixel'ini taşıyabilmeli.
- PayTR: mağaza onayı gerekiyor, onay süresi belli değil. Kapıda ödeme onaysız da çalışmalı.
- Yerel geliştirme hızlı olmalı. Node seçiminin sebebi bu. **[Kullanıcı]**

## 6. Yaklaşımlar

| Yaklaşım | Artı | Eksi |
|---|---|---|
| **A. Next.js + kendi yazdığımız yönetim paneli + PostgreSQL (seçilen)** | Tek dil (TypeScript). Panel tamamen bu iş akışına göre şekillenir, dış CMS bağımlılığı yok. Yerel geliştirme hızlı. SaaS'a evrilebilir. | Liste, form ve filtre ekranları elle yazılır, Faz 1 daha uzun sürer. Kimlik doğrulama ve yetki de bizde. |
| B. Next.js + Payload CMS | Admin ekranları ayarla tanımlanır, hızlı kurulur. | Kullanıcı istemedi. Panel Payload'un kalıplarına bağlı kalır. |
| C. Laravel + Filament | Admin panel çok hızlı kurulur, barındırma ucuz. | Kullanıcı Node tercih etti, yerel geliştirme hızı ön planda. |
| D. Hazır platform (Medusa/Saleor) veya SaaS (Shopify/ikas) | Sepet, indirim, entegrasyonlar hazır. | Landing odaklı tek ürünlü akış, çok domain ve site başına pixel hiçbirinde hazır değil. SaaS satma hedefiyle çelişir. |

**Seçim:** A. **[Kullanıcı]** Kullanıcı Node'u yerel geliştirmenin hızlı olması için, kendi yazılmış paneli de Payload yerine tercih etti. Kütüphane seçimleri (7. bölüm) benim önerim. **[Öneri]**

## 7. Mimari

**Tek uygulama, tek veritabanı.** **[Öneri]**

- Next.js (App Router), TypeScript. Landing sayfaları, yönetim paneli ve API aynı uygulamada.
- PostgreSQL + Drizzle ORM (tipli şema ve migration).
- Yönetim paneli arayüzü: Tailwind + shadcn/ui bileşenleri, tablolar için TanStack Table, formlar için React Hook Form + Zod. Zod şemaları sunucu doğrulamasında da kullanılır.
- Panel kimlik doğrulaması: Better Auth (e-posta + şifre, iki adımlı doğrulama eklentisi, oturum yönetimi). Rol kontrolü kendi kodumuzda.
- Medya dosyaları ilk sürümde yerel diskte, yükleme sırasında WebP'ye dönüştürülür (sharp). İleride S3 uyumlu bir depolamaya (Cloudflare R2 gibi) taşınabilir.
- Arka plan işleri (bildirim gönderimi, terk edilen ödemeleri kapatma, Meta CAPI gönderimi, zamanlı işler) için pg-boss. Kuyruğu PostgreSQL'in içinde tutar, ayrı bir Redis gerekmez.
- Uygulama iki süreçle çalışır: web sunucusu ve iş işleyici (worker). Kod tabanı ortak.

**Adres çözümleme**

- Next.js middleware gelen Host başlığına bakar.
- Host panel adresiyse (ör. `panel.anadomain.com`) admin'e gider. Başka bir adresse `sites` tablosundan site bulunur ve landing render edilir.
- Bulunamayan veya kapatılmış site için 404 ya da panelden tanımlı yönlendirme.

**Domain ve SSL** **[Öneri]**

- Her ana domain Cloudflare'de. `*.domain.com` wildcard kaydı sunucuya bakar, proxy açık.
- Cloudflare'in ücretsiz edge sertifikası tek seviyeli subdomain'leri kapsar (kurulumda doğrulanacak). Sunucuda Cloudflare Origin sertifikası.
- **İlk etapta domain olarak sadece `localhost` kullanılacak.** **[Kullanıcı]** Siteler `poset.localhost:3000` gibi adreslerde, panel `panel.localhost:3000` adresinde çalışır. Gerçek domainler sonradan panelden eklenir. Kod domain adına bağımlı olmamalı, `localhost` sıradan bir Domains kaydıdır.
- Yeni subdomain eklemek için DNS'e dokunmak gerekmez. Yeni ana domain eklemek için kullanıcı domaini Cloudflare'e ekler, panelde kaydeder.

**Barındırma** **[Öneri]**

- Tek VPS (4 vCPU / 8 GB civarı), Docker kullanılmadan: Node 22 + PM2 (web ve worker süreçleri), sisteme kurulu PostgreSQL 16, önde Caddy veya Cloudflare. **[Kullanıcı: Docker kullanılmayacak]**
- Yerelde `pnpm dev` + bilgisayara doğrudan kurulu PostgreSQL. Yerelde subdomain testi için `*.localhost` adresleri kullanılır (ör. `poset.localhost:3000`), ek DNS ayarı gerekmez.

**Performans**

- Landing sayfaları sunucuda render edilir ve cache'lenir. Panelden site veya ürün değişince o sitenin cache'i temizlenir.
- Landing'de ağır kütüphane yok (rakipteki three.js gibi). Görseller WebP ve boyutlu.
- Sipariş formu sayfa cache'inden bağımsız çalışır.
- Hedef: orta seviye bir Android telefonda 4G'de sayfa 2,5 saniyenin altında kullanılabilir olsun (LCP).

## 8. Veri modeli (PostgreSQL tabloları)

Para alanlarının hepsi **kuruş cinsinden tam sayı**. Ondalık sayı kullanılmaz. **[Öneri]**

- **Domains:** ad, durum (aktif/pasif), not.
- **Products:** ad, SKU, KDV oranı, maliyet, `track_stock`, stok adedi, durum.
  - **Kapıda ödeme hizmet bedeli ürün bazında seçilir.** **[Kullanıcı]** Ürün ayarında "kapıda ödeme bedeli alınsın" açılıp kapatılır. Açıksa nakit ve kart için ayrı tutar girilir, biri 0 olabilir. **[Öneri]** Bedel siparişte ayrı bir satır olarak görünür ve sayfada ödeme türü seçilince toplam anında güncellenir. Şablon içeriği de burada tutulur: başlık, alt başlık, özellik listesi, nasıl kullanılır adımları, teknik özellikler, SSS, görseller, video, yorumlar.
- **Sites:**
  - Domain + subdomain (birlikte tekil), ürün, durum (taslak/yayında/kapalı/yönlendir).
  - Meta pixel kimliği ve CAPI erişim anahtarı. **Her sitenin pixel'i ayrıdır.** **[Kullanıcı]** Pixel siteye aittir, üründen veya domainden miras alınmaz. Pixel girilmemiş bir site yayına alınabilir ama panel uyarı gösterir.
  - Tema ayarları (ana renk vb.).
  - İçerik üzerine yazma: aynı ürünün farklı sitesi farklı başlık, görsel veya video kullanabilir (reklam testi).
  - Bir ürünün birden fazla sitesi olabilir. **[Öneri]**, kullanıcının "farklı subdomain'lerle test" amacına dayanıyor.
- **Offers (paketler):** ürün, sıra, etiket ("En çok tercih edilen"), ödenen adet, bedava adet, toplam fiyat, kargo ücretsiz mi, opsiyonel başlangıç ve bitiş zamanı.
  - "3 al 2 öde" = 3 adet: 2 ücretli + 1 bedava, toplam fiyat 2'li paketin fiyatı.
  - Site bazında fiyat üzerine yazma yapılabilir. Bu sadece fiyatı değiştirir, kargo kuralını değiştirmez.
  - Teklifler sürümlenir: düzenleme yeni sürüm oluşturur, eski siparişler eski sürüme bağlı kalır.
  - **Zamanlı teklif** **[Öneri]**: bitiş zamanı olan bir teklif, o zamana kadar geçerlidir. Geri sayım bu zamana sayar. Süre bitince teklif listeden düşer ve aynı paket için zamansız (varsayılan) teklif devreye girer. Fiyat fonksiyonu "şu anki zaman"ı girdi olarak alır. Sayfa cache'i en yakın bitiş zamanında kendiliğinden geçersiz olur.
- **Addons (ek ürünler):** ana ürüne bağlı ek ürün, adet seçenekleri ve fiyatları, kendi stoğu.
- **Orders:**
  - Site, ürün, müşteri adı, telefon, il, ilçe, açık adres, e-posta (opsiyonel), TCKN/VKN (opsiyonel, e-fatura için).
  - Ödeme türü (`cod_cash` / `cod_card` / `online`), sipariş durumu, ödeme durumu.
  - Tutarlar: ara toplam, indirim, kargo, KDV, genel toplam.
  - `pricing_snapshot` (hesaplanan fiyatın tam kopyası), teklif ve sürümü.
  - Kaynak bilgisi: UTM parametreleri, `fbclid`, `fbp`/`fbc` çerezleri, IP, user agent.
  - Risk skoru ve mükerrer işareti, iç notlar, kargo takip numarası (elle girilir).
- **OrderItems:** ürün adı ve SKU kopyası, adet, liste fiyatı, net fiyat, KDV, satır türü (`paid` / `gift` / `addon` / `shipping`), `is_free`.
- **StockMovements:** kalem, adet değişimi, sebep. Bedava kalem de stok düşer.
- **Payments:** sipariş, sağlayıcı, sağlayıcı sipariş kodu, tutar, durum, ham callback kayıtları.
- **OrderEvents:** durum değişiklikleri, kim yaptı, ne zaman. Panelde siparişin geçmişi olarak görünür.
- **Settings (global):** işletme bilgileri, yasal sayfa metinleri, kargo ücreti, ücretsiz kargo eşiği, çerez onay bandı açık/kapalı, bildirim kanalları, kara liste.
  - **Domain bazında üzerine yazma** **[Öneri]**: işletme bilgileri ve yasal metinler Domains kaydında opsiyonel olarak tekrar girilebilir. Boşsa global ayar kullanılır. Böylece farklı ana domainler ileride farklı satıcı kimliğiyle çalışabilir.
- **Users:** panel kullanıcıları ve rolleri (admin, operatör).

## 9. Landing şablonu

Tek şablon. Bölümler sabit sırada, her bölüm panelden açılıp kapatılabilir. Bölümler rakip sitelerdeki yapıdan türetildi:

1. Üst duyuru şeridi ve kayan bant.
2. Hero: başlık, alt başlık, ana görsel/video, "Hemen sipariş ver" butonu.
3. Sorun bölümü: "tanıdık geldi mi?" kartları.
4. Özellikler, nasıl kullanılır adımları, öncesi/sonrası, teknik özellikler, karşılaştırma.
5. Müşteri yorumları.
6. SSS.
7. Sipariş formu: paketler, ek ürünler, müşteri bilgileri, il/ilçe, ödeme türü, toplam, sözleşme onayı, sipariş butonu.
8. Footer: işletme bilgileri, yasal sayfa linkleri.
9. Mobilde altta sabit "Sipariş ver" butonu.

**Aciliyet ve teşvik** **[Öneri]**: hepsi gerçek veriye bağlı ve panelden açılıp kapatılabilir.

- **Kampanya geri sayımı:** panelde girilen gerçek bitiş zamanına sayar. Süre bitince sıradaki planlanan teklife geçilir, ya da sayaç gizlenir.
- **Canlı sipariş bildirimi:** "Ankara'dan Ayşe K. 12 dk önce 2'li paket aldı". Gerçek siparişlerden üretilir, isim kısaltılır, telefon ve adres gösterilmez.
- **Stok göstergesi:** "Son 23 adet". Sadece stok takibi açık ürünlerde, gerçek sayıdan.
- **Paket kazancı:** "2'li pakette 300 ₺ kazanırsın". Hesap gerçek tekli fiyata göre yapılır.
- **Ek ürün teklifi** formun içinde, "siparişine ekle, ek kargo yok".
- **Sosyal kanıt:** gerçek satış sayısı (eşik altında gizlenir) ve panelden girilen gerçek yorumlar.

**Yasal sayfalar:** mesafeli satış sözleşmesi, ön bilgilendirme, iade ve cayma, gizlilik ve KVKK, çerez politikası, iletişim. Metinler Settings'ten gelir, her siteye otomatik eklenir. Sözleşme onayı zorunlu bir kutu olarak formda durur. Bu sayfalar PayTR onayı için de gerekiyor.

**Yapay zekâ ile ürün oluşturma (Faz 1, ana ürün ekleme yolu)** **[Kullanıcı]**

Her ürün sayfası aynı şablonu kullanır. Yeni ürün eklemenin ana yolu yapay zekâdır: alanları yapay zekâ doldurur, kullanıcı kontrol edip yayına alır.

Akış **[Öneri]**:
1. Panelde "Yeni ürün" sihirbazı açılır. Kullanıcı ürün adını, kısa açıklamayı, serbest notları (özellikler, hedef kitle, fark yaratan yanı) girer ve ürün görsellerini/videosunu yükler.
2. Yapay zekâ şablonun bütün metin alanlarını doldurur: başlık ve alt başlık, kayan bant metinleri, sorun kartları, özellikler, nasıl kullanılır adımları, öncesi/sonrası metinleri, teknik özellikler tablosu, karşılaştırma, SSS, paket etiketleri ("En çok tercih edilen" gibi), ek ürün tanıtım metni, tema rengi önerisi.
3. Yapay zekâ yüklenen görselleri görür, her görseli uygun bölüme yerleştirir ve alt metin yazar.
4. **Fiyatları, paket adetlerini, stok ve kapıda ödeme bedelini yapay zekâ doldurmaz.** Bunları kullanıcı girer. Sebep: fiyat ve kampanya kullanıcının ticari kararı, yanlış bir değer doğrudan para kaybı.
5. Sonuç taslak olarak kaydedilir. Kullanıcı önizler, istediği alanı elle düzeltir veya tek bir bölümü "yeniden üret" ile yeniden yazdırır, sonra yayına alır.

Teknik:
- Model: Claude API, yapılandırılmış çıktı (şablon alanlarına birebir uyan JSON şeması). Şema Zod ile tanımlı, dönen sonuç doğrulanmadan kaydedilmez. **[Öneri]**
- Yapay zekâ görsel üretmez, sadece yüklenen görselleri yorumlar.
- Prompt'a "sağlık iddiası, garanti, uydurma rakam ve uydurma yorum yazma" kuralı eklenir. Sebebi Meta reklam politikası. Müşteri yorumları yapay zekâyla üretilmez, gerçek yorumlar panelden girilir.
- API anahtarı sunucuda tutulur. Her üretimin girdi, çıktı ve maliyeti loglanır.
- Faz 1'de tedarikçi linkinden (Alibaba, Trendyol vb.) bilgi ve görsel çekme yok. Girdi kullanıcının notları ve yüklediği görsellerdir. Link ile içe aktarma ileride ayrı bir parça olarak eklenebilir. **[Öneri]**

**Müşteri yorumları** **[Öneri, kullanıcı onayladı]**
- Yorumlar yapay zekâyla üretilmez. Yorumların kaynağı iki yol: panelden elle girilen gerçek yorumlar, ve teslimden sonra müşteriye WhatsApp ile giden yorum linki (puan, metin, isteğe bağlı fotoğraf). Linkten gelen yorum siparişe bağlanır ve "Doğrulanmış alıcı" etiketi taşır. Yorumlar panelde onaylanmadan yayınlanmaz.
- Yapay zekâ gerçek yorumlar üzerinde çalışır: öne çıkacakları seçer, "Müşteriler en çok şunu beğendi" özetini yazar, uygunsuz içeriği ve kişisel veriyi işaretler, yazım düzeltmesini kullanıcı onayıyla önerir.
- Yorumu olmayan üründe yorum bölümü gizlenir. Yerine yapay zekânın yazdığı "Kimler için, nerede kullanılır" bölümü gösterilir. İlk onaylı yorum gelince yorum bölümü kendiliğinden açılır.
- Teslim sonrası yorum isteği Faz 1'de yer alır, çünkü NetGSM WhatsApp altyapısı OTP için zaten kuruluyor.

## 10. Sipariş akışı

1. Müşteri formu gönderir. Tarayıcıdan sadece şunlar gelir: site (Host'tan çözülür), teklif kimliği, seçilen ek ürünler, müşteri bilgileri, ödeme türü. **Fiyat gelmez.**
2. Sunucu fiyatı hesaplar. Bu hesap tek bir saf fonksiyonda yapılır: girdi (teklif, ek ürünler, ödeme türü, site, şu anki zaman) → fiyat teklifi (kalemler, indirim, kargo, kapıda ödeme bedeli, KDV, toplam). Fonksiyon yan etkisizdir ve tablo tabanlı testlerle sınanır. Sayfadaki toplam da aynı fonksiyonun sonucundan gösterilir. Hesap kuralları **[Öneri]**:
   - Kargo: teklifte "kargo ücretsiz" işaretliyse 0. Değilse, ara toplam (indirim sonrası, ek ürünler dahil) ücretsiz kargo eşiğine ulaşıyorsa 0. Aksi halde global kargo ücreti.
   - Kapıda ödeme hizmet bedeli, ürün ayarında açıksa, seçilen ödeme türünün tutarıyla ayrı bir satır olarak eklenir. Online ödemede eklenmez.
3. Doğrulama: telefon formatı, il/ilçe geçerliliği, honeypot alanı, IP başına hız sınırı.
4. Mükerrer kontrolü: aynı telefon ve aynı ürün için son 24 saatte sipariş varsa sipariş yine kaydedilir ama "mükerrer olabilir" diye işaretlenir. Kara listedeki telefon veya IP işaretlenir.
5. Sipariş ve kalemler tek bir veritabanı işleminde (transaction) `dogrulama_bekliyor` durumunda yazılır. Stok açıksa stok aynı işlemde atomik olarak düşer. Stok yetersizse sipariş reddedilir.
6. **Telefon doğrulaması (OTP)** **[Kullanıcı]**: NetGSM üzerinden müşterinin telefonuna WhatsApp ile onay kodu gider. Müşteri kodu aynı sayfada girer, kod doğruysa sipariş `yeni` durumuna geçer. Telefonla teyit araması yapılmaz. Ayrıntılar **[Öneri]**:
   - 6 haneli kod, 3 dakika geçerli, en fazla 5 deneme. Yeniden gönderim 60 saniye sonra açılır. Telefon ve IP başına saatlik gönderim sınırı var.
   - Kod veritabanında düz metin değil, hash olarak saklanır.
   - WhatsApp mesajı iletilemezse aynı kod NetGSM üzerinden SMS olarak gönderilir. NetGSM'in WhatsApp onay mesajı hizmetinin kapsamı, şablon onayı ve fiyatı kodlamadan önce NetGSM'den doğrulanacak.
   - Gönderim bir arayüzün arkasında (`OtpProvider`). Yerel geliştirmede kod konsola ve panele yazılır, gerçek mesaj gitmez.
   - Doğrulanmayan siparişler silinmez, panelde "doğrulanmamış" filtresiyle ayrı listelenir. 30 dakika içinde doğrulanmazsa kuyruk işi siparişi `dogrulanmadi` yapar ve stoğu geri ekler. Operatör isterse bu siparişi elle onaylayabilir.
7. Doğrulanan kapıda ödemeli siparişte müşteri teşekkür sayfasına gider. Online ödemede PayTR iFrame'i açılır (Faz 2). Teşekkür sayfasında sipariş özeti ve sözleşme metinlerinin indirilebilir kopyası bulunur. E-posta girildiyse aynı içerik e-postayla da gider. SMS Faz 3'te. **[Öneri]**
8. Yeni sipariş bildirimi Telegram'a gider (kuyruk üzerinden). **[Öneri]**
9. **Meta Purchase olayı sipariş anında gider.** **[Kullanıcı]** "Sipariş anı" telefon doğrulamasının tamamlandığı an olarak yorumlandı, çünkü doğrulanmamış form gönderimleri büyük ölçüde sahte sipariştir ve Meta'nın optimizasyonunu bozar. **[Öneri, kullanıcı onayı bekliyor]** Olay, sitenin kendi pixel'i ve CAPI anahtarıyla kuyruktan sunucu tarafında gönderilir. Aynı `event_id` (sipariş no) teşekkür sayfasındaki pixel olayında da kullanılır, Meta ikisini tekilleştirir. Sonradan iptal veya iade olan siparişler için ek olay gönderilmez.
   - Form gönderildiğinde (doğrulamadan önce) `InitiateCheckout` olayı gönderilir. Böylece Meta tarafında doğrulamaya kadar gelen kişiler de görülür.

**Sipariş durumları:** `dogrulama_bekliyor` → `yeni` → `onaylandi` → `kargoda` → `teslim_edildi`. Doğrulama bekleyenden `dogrulanmadi`. Her aşamadan `iptal`, kargodan sonra `iade` mümkün.

**Operatör düzenlemesi** **[Öneri]**: Faz 1'de operatör siparişte sadece adres, ilçe, isim ve iç not düzeltebilir. Paket, ek ürün ve fiyat değiştirilemez. Fiyatı değişecek bir durumda sipariş iptal edilip yenisi oluşturulur. Böylece fiyat kopyası ve Meta'ya giden değer değişmez kalır.

**Stok kuralları** **[Öneri]** (sadece stok takibi açık ürünlerde):
- Kapıda ödemede stok sipariş oluşunca düşer. Online ödemede ödeme başlatılınca düşer.
- `iptal` ve online `terk` olunca stok otomatik geri eklenir.
- `tahsil_edilemedi` ve `iade` durumlarında stok otomatik eklenmez. Operatör "ürün depoya döndü" işaretleyince eklenir, çünkü kargodan dönen ürün hasarlı veya kayıp olabilir.
- Her hareket StockMovements'a sebebiyle yazılır. Aynı sebep aynı kalem için ikinci kez yazılamaz, böylece stok iki kez düşmez veya eklenmez.

**Ödeme durumları:**
- Kapıda: `tahsil_bekliyor` → `tahsil_edildi` / `tahsil_edilemedi`.
- Online: `baslatildi` → `basarili` / `basarisiz` / `terk` (60 dk sonra kuyruk işi kapatır) → `iade` / `kismi_iade`.

## 11. PayTR (Faz 2)

- iFrame API. Kart verisi sunucuya girmez.
- Ödeme sağlayıcısı bir arayüzün arkasında yazılır (`PaymentProvider`). İleride iyzico eklemek kolay olur.
- Callback tek merkezi adreste: `panel.anadomain.com/api/paytr/callback`. Bu adres bot korumasının dışında tutulur.
- Hash doğrulanır, tutar sunucudaki teklifle karşılaştırılır. İşleme idempotent yapılır: aynı bildirim tekrar gelirse yine `OK` döner ama hiçbir şey ikinci kez yapılmaz. Ham gövde saklanır.
- Sipariş yalnızca doğrulanmış callback ile "ödendi" olur.
- Hash formülü ve domain onayı kuralları kodlamadan önce PayTR'ın resmi dokümanından ve destek ekibinden doğrulanacak.

## 12. Panel ekranları

- **Pano:** bugünkü siparişler, site bazında ziyaret, sipariş ve dönüşüm. Reklam harcaması elle girilirse sipariş başına maliyet (Faz 2).
- **Siparişler:**
  - Tüm sitelerden tek liste. Site, ürün, durum, ödeme türü, tarih ve mükerrer işaretine göre filtre.
  - Toplu durum değiştirme.
  - Excel/CSV dışa aktarma (sadece admin rolü).
  - Sipariş detayı: kalemler, fiyat kopyası, geçmiş, iç not.
- **Ürünler:** içerik, paketler, ek ürünler, stok, yapay zekâ butonu.
- **Siteler:** domain + subdomain seçimi, ürün seçimi, pixel, tema, içerik üzerine yazma, önizleme, yayına alma, kapatma veya yönlendirme.
- **Domainler, Ayarlar, Kullanıcılar, Kara liste.**
- Panel güvenliği: iki adımlı doğrulama, oturum zaman aşımı, işlem logu.
- Panel ekranları ortak bir liste bileşeni (sayfalama, sıralama, filtre, toplu işlem) ve ortak bir form düzeni üzerine kurulur. Her yeni ekran bunları yeniden kullanır. **[Öneri]**

## 13. Fazlar

**Faz 1 (ilk sürüm):**
- Domain ve site yönetimi, Host ile site çözümleme.
- Ürün ve şablon, paketler (bedava adet dahil), ek ürünler, ücretsiz kargo eşiği.
- Kapıda nakit ve kapıda kart siparişi.
- NetGSM ile WhatsApp OTP doğrulaması (SMS yedekli).
- Opsiyonel stok takibi.
- Tek sipariş paneli ve sipariş durumları.
- Mükerrer kontrolü ve spam koruması.
- Telegram bildirimi.
- Meta pixel + CAPI.
- Yasal sayfalar.
- Gerçek veriye bağlı aciliyet bileşenleri.
- Yapay zekâ ile yeni ürün sihirbazı (şablon alanlarını doldurur).
- Yedekleme.

**Faz 2:** PayTR online ödeme, site bazında dönüşüm ve kâr panosu, reklam harcaması girişi.

**Faz 3:** kargo entegrasyonu, e-fatura entegrasyonu, kupon, operatörün siparişte paket ve ek ürün değiştirebilmesi (yeniden fiyatlama ile).

## 14. Açık kararlar (kullanıcıya sorulacak)

Açık karar kalmadı. Cevaplananlar **[Kullanıcı]**: her sitenin pixel'i ayrı; ilk etapta domain `localhost`; kapıda ödeme bedeli ürün bazında seçilir; telefon teyidi NetGSM ile WhatsApp OTP; Meta Purchase sipariş anında.

Kullanıcının kontrol etmesi gereken yorumum: "sipariş anı" = OTP doğrulandığı an (10. bölüm, madde 9).

**Pixel ve çerez onayı** **[Öneri]**: Kullanıcı hukuki konulara takılmamayı tercih etti. Bu yüzden çerez onay bandı Settings'te açılıp kapatılabilen bir özellik olarak yapılır, varsayılanı kapalı. Kapalıyken pixel ve CAPI hemen çalışır. Açıkken pixel ve `fbp`/`fbc` toplama onaydan sonra başlar, onay durumu siparişe yazılır ve CAPI buna uyar. Bant, cache'lenen sayfayı bozmayacak şekilde tarayıcı tarafında gösterilir.

## 15. Uygulayıcıya bırakılanlar

- Klasör yapısı, test çerçevesi (Vitest + Playwright önerilir).
- Panel ekranlarının görsel düzeni (shadcn/ui varsayılanlarıyla sade bir yönetim arayüzü yeterli).
- İl/ilçe verisinin kaynağı (açık bir veri seti, depoya gömülü).
- Cache temizleme mekanizmasının ayrıntısı.
- Telegram bildirim mesajının biçimi.
- Risk skorunun ağırlıkları (basit kurallarla başlanır).
