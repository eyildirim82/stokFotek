# Kullanıcı Kılavuzu

## İçindekiler

1. [Giriş](#giriş)
2. [İlk Adımlar](#ilk-adımlar)
3. [Kullanıcı Rolleri](#kullanıcı-rolleri)
4. [Ürün Yönetimi](#ürün-yönetimi)
5. [Stok Yönetimi](#stok-yönetimi)
6. [Raporlama](#raporlama)
7. [Kullanıcı Yönetimi](#kullanıcı-yönetimi-1)
8. [Sık Sorulan Sorular](#sık-sorulan-sorular)

## Giriş

Envanter Yönetim Sistemi, ürünlerinizi ve stok seviyelerinizi kolayca takip etmenizi sağlayan web tabanlı bir uygulamadır. Sistem çok organizasyonlu yapıya sahiptir ve her organizasyon kendi verilerini izole bir şekilde yönetir.

### Temel Özellikler

- **Ürün Katalogu**: Ürünlerinizi SKU, isim, fiyat bilgileriyle saklayın
- **Stok Takibi**: Gerçek zamanlı stok seviyeleri
- **Stok Hareketleri**: Giriş, çıkış ve düzeltme işlemlerini kaydedin
- **Toplu İşlemler**: CSV ile toplu ürün ekleme
- **Raporlama**: Detaylı işlem geçmişi ve aktivite kayıtları
- **Kullanıcı Yönetimi**: Rol bazlı erişim kontrolü

## İlk Adımlar

### 1. Kayıt Olma

1. Ana sayfada "Kayıt Ol" sekmesine tıklayın
2. E-posta adresinizi girin
3. Güvenli bir şifre oluşturun
4. Tam adınızı girin
5. "Kayıt Ol" butonuna tıklayın

**Önemli:** İlk kayıt olan kullanıcı otomatik olarak yeni bir organizasyon oluşturur ve admin rolü alır.

### 2. Giriş Yapma

1. E-posta ve şifrenizi girin
2. "Giriş Yap" butonuna tıklayın
3. Eğer birden fazla organizasyona üyeyseniz, sağ üst köşeden organizasyon seçebilirsiniz

### 3. Dashboard'a Genel Bakış

Ana ekranda göreceğiniz sekmeler:
- **Ürünler**: Tüm ürünlerinizin listesi
- **İşlem Geçmişi**: Stok hareketleri geçmişi
- **Aktivite Kayıtları**: Sistem aktiviteleri (Admin/Manager)
- **Kullanıcılar**: Kullanıcı yönetimi (Sadece Admin)

## Kullanıcı Rolleri

Sistemde 4 farklı kullanıcı rolü bulunmaktadır:

### Admin (Yönetici)
- **Tam Erişim**: Tüm özelliklere erişim
- **Kullanıcı Yönetimi**: Yeni kullanıcı ekleme, rol değiştirme
- **Ürün Yönetimi**: Ürün ekleme, düzenleme, silme
- **Stok Yönetimi**: Stok giriş/çıkış işlemleri
- **Raporlar**: Tüm raporlara erişim

### Manager (Müdür)
- **Ürün Yönetimi**: Ürün ekleme ve düzenleme
- **Stok Yönetimi**: Stok giriş/çıkış işlemleri
- **Raporlar**: İşlem geçmişi ve aktivite kayıtları
- **Kısıtlama**: Kullanıcı yönetimi yapamaz

### Warehouse Staff (Depo Personeli)
- **Stok Yönetimi**: Sadece stok giriş/çıkış işlemleri
- **Görüntüleme**: Ürün listesini ve işlem geçmişini görebilir
- **Kısıtlama**: Ürün ekleme/düzenleme yapamaz

### Viewer (İzleyici)
- **Salt Okunur**: Sadece görüntüleme yetkisi
- **Kısıtlama**: Hiçbir değişiklik yapamaz

## Ürün Yönetimi

### Yeni Ürün Ekleme (Admin/Manager)

1. **"Yeni Ürün" butonuna tıklayın**
2. **Formu doldurun:**
   - **SKU**: Ürün kodu (zorunlu, benzersiz olmalı)
     - Örnek: `PROD-001`, `SKU-123`
   - **Ürün Adı**: Ürünün tam adı (zorunlu)
   - **Alış Fiyatı**: USD cinsinden maliyet (zorunlu)
   - **Liste Fiyatı**: Satış fiyatı (opsiyonel)
   - **Minimum Stok Seviyesi**: Uyarı için eşik değer (varsayılan: 10)
   - **Başlangıç Stok Miktarı**: İlk stok (varsayılan: 0)
3. **"Kaydet" butonuna tıklayın**

**Otomatik İşlemler:**
- SKU büyük/küçük harf duyarlıdır
- Başlangıç stoğu > 0 ise otomatik ADJUST işlemi oluşturulur
- Aktivite kaydı oluşturulur

### Ürün Düzenleme (Admin/Manager)

1. Ürün listesinde düzenlemek istediğiniz ürünün satırına tıklayın
2. Değiştirmek istediğiniz alanları güncelleyin
3. "Kaydet" butonuna tıklayın

**Not:** SKU düzenlenemez. SKU değişikliği için ürünü silip yeniden oluşturmanız gerekir.

### Toplu Ürün İçe Aktarma (Admin/Manager)

1. **"Toplu İçe Aktar" butonuna tıklayın**
2. **CSV dosyası hazırlayın:**
   ```csv
   SKU,Ürün Adı,Stok,Alış Fiyatı,Liste Fiyatı
   PROD-001,Laptop,10,500.00,799.99
   PROD-002,Mouse,50,10.50,19.99
   PROD-003,Keyboard,30,25.00,49.99
   ```
3. **Dosyayı yükleyin**
4. **Önizlemeyi kontrol edin**
5. **"X Ürünü İçe Aktar" butonuna tıklayın**

**Önemli Notlar:**
- İlk satır başlık satırıdır
- SKU'lar benzersiz olmalı (mevcut SKU varsa hata alırsınız)
- Liste Fiyatı boş bırakılabilir
- Tüm fiyatlar USD cinsinden
- Virgüllü değerlerde nokta kullanın (10.50, 799.99)

### Ürün Arama ve Filtreleme

**Arama Çubuğu:**
- SKU veya ürün adına göre arayın
- Canlı arama (yazarken sonuçlar güncellenir)

**Stok Durumu Filtreleri:**
- **Tümü**: Tüm ürünleri göster
- **Düşük Stok**: Minimum seviyenin altındaki ürünler (sarı uyarı)
- **Stok Yok**: 0 stoklu ürünler (kırmızı uyarı)

## Stok Yönetimi

### Stok Girişi (Admin/Manager/Warehouse Staff)

Yeni ürün geldiğinde veya satın alma sonrası:

1. **Ürün listesinde yeşil "+" ikonuna tıklayın**
2. **Formu doldurun:**
   - **Miktar**: Giren miktar (pozitif sayı)
   - **Referans No**: İrsaliye veya fatura numarası (opsiyonel)
3. **"Kaydet" butonuna tıklayın**

**Sistem otomatik olarak:**
- Mevcut stoğa miktarı ekler
- İşlem kaydı oluşturur (yeşil IN badge)
- Aktivite logu ekler

**Örnek Senaryo:**
- Mevcut stok: 100
- Giriş miktarı: 50
- Yeni stok: 150

### Stok Çıkışı (Admin/Manager/Warehouse Staff)

Satış veya kullanım sonrası:

1. **Ürün listesinde kırmızı "-" ikonuna tıklayın**
2. **Formu doldurun:**
   - **Miktar**: Çıkan miktar (pozitif sayı girin, sistem otomatik eksi yapar)
   - **Referans No**: Sevk irsaliyesi veya sipariş numarası
3. **"Kaydet" butonuna tıklayın**

**Sistem otomatik olarak:**
- Mevcut stoktan miktarı çıkarır
- İşlem kaydı oluşturur (kırmızı OUT badge)
- Aktivite logu ekler

**Örnek Senaryo:**
- Mevcut stok: 100
- Çıkış miktarı: 25
- Yeni stok: 75

### Stok Düzeltme

Sayım sonrası veya hatalı kayıt düzeltme için:

**Yöntem 1: Ürün Düzenleme (Admin/Manager)**
- Ürünü düzenle modalından doğrudan stok miktarını değiştirebilirsiniz
- Sistem otomatik ADJUST işlemi oluşturur

**Yöntem 2: Giriş/Çıkış İşlemi**
- Farkı hesaplayıp giriş veya çıkış olarak kaydedin
- Reason Code: "STOCK_COUNT" veya "ADJUSTMENT"

### Eşzamanlılık Koruması

Sistem optimistic locking kullanır:
- Aynı anda iki kullanıcı aynı ürünü güncellemeye çalışırsa
- İkinci güncelleme başarısız olur
- Hata mesajı: "Ürün başka bir kullanıcı tarafından güncellenmiş"
- **Çözüm**: Sayfayı yenileyin ve tekrar deneyin

## Raporlama

### İşlem Geçmişi

Tüm stok hareketlerini görüntüleyin:

**Filtreleme Seçenekleri:**
1. **İşlem Tipi**
   - Tümü
   - Giriş (IN)
   - Çıkış (OUT)
   - Düzeltme (ADJUST)

2. **SKU Arama**
   - Belirli bir ürünün işlemlerini bulun

3. **Tarih Aralığı**
   - Başlangıç ve bitiş tarihi seçin
   - Son 7 gün, son 30 gün vb.

**Rapor Dışa Aktarma:**
1. Filtreleri uygulayın
2. "CSV İndir" butonuna tıklayın
3. Dosya otomatik olarak indirilir
4. Excel veya Google Sheets'te açabilirsiniz

**CSV Formatı:**
```csv
Tarih,SKU,Ürün,İşlem Tipi,Miktar,Referans No,Neden
28.02.2026 14:30,PROD-001,Laptop,Giriş,10,PO-12345,
28.02.2026 15:45,PROD-001,Laptop,Çıkış,-5,INV-67890,
```

### Aktivite Kayıtları (Admin/Manager)

Sistem genelindeki tüm aktiviteleri görüntüleyin:

**Kayıt Edilen Aktiviteler:**
- Ürün oluşturma/düzenleme/silme
- Stok giriş/çıkış işlemleri
- Toplu içe aktarma
- Kullanıcı giriş/çıkış (gelecek özellik)

**Filtreleme:**
1. **İşlem Tipi**: create, update, delete, stock_in, stock_out
2. **Tarih Aralığı**: Belirli bir zaman dilimi

**Detayları Görüntüleme:**
- Her kayıtta "Detayları Görüntüle" linkine tıklayın
- JSON formatında payload bilgisi açılır
- Değişiklikler, eski/yeni değerler vb.

**Örnek Payload:**
```json
{
  "sku": "PROD-001",
  "product_name": "Laptop",
  "old_stock": 100,
  "new_stock": 150,
  "quantity": 50,
  "reference_number": "PO-12345"
}
```

## Kullanıcı Yönetimi (Sadece Admin)

### Yeni Kullanıcı Ekleme

1. **"Kullanıcılar" sekmesine gidin**
2. **"Yeni Kullanıcı" butonuna tıklayın**
3. **Formu doldurun:**
   - **E-posta**: Kullanıcının e-posta adresi
   - **Tam Ad**: Kullanıcının adı soyadı
   - **Şifre**: Geçici şifre (kullanıcı değiştirebilir)
   - **Rol**: admin, manager, warehouse_staff, viewer
4. **"Kullanıcı Ekle" butonuna tıklayın**

**Otomatik İşlemler:**
- Kullanıcı hesabı oluşturulur
- Profil kaydı eklenir
- Organizasyona rol ile atanır
- Kullanıcıya bilgilendirme e-postası gönderilir (gelecek özellik)

### Kullanıcı Rolü Değiştirme

1. Kullanıcı listesinde rol değiştirmek istediğiniz kullanıcıyı bulun
2. Rol dropdown'ından yeni rolü seçin
3. Otomatik olarak kaydedilir

**Dikkat:** Kendi rolünüzü değiştiremezsiniz!

### Kullanıcı Silme

1. Kullanıcı listesinde çöp kutusu ikonuna tıklayın
2. Onay dialogunda "Evet" deyin
3. Kullanıcı organizasyondan çıkarılır

**Not:** Kullanıcı hesabı Supabase Auth'ta kalır, sadece organizasyon üyeliği silinir.

## Organizasyon Yönetimi

### Organizasyon Değiştirme

Eğer birden fazla organizasyona üyeyseniz:

1. Sağ üst köşedeki organizasyon seçiciye tıklayın
2. Listeden organizasyon seçin
3. Sayfa otomatik olarak yenilenir
4. Seçilen organizasyonun verileri gösterilir

**Önemli:** Her organizasyon tamamen izole çalışır. Bir organizasyonun verilerini diğeri göremez.

### Varsayılan Organizasyon

Son kullandığınız organizasyon otomatik olarak varsayılan organizasyon olarak kaydedilir. Bir sonraki girişinizde bu organizasyon açılır.

## Sık Sorulan Sorular

### Genel Sorular

**S: Şifremi unuttum, ne yapmalıyım?**
C: "Şifremi Unuttum" linkine tıklayın. E-postanıza şifre sıfırlama linki gönderilecektir.

**S: Birden fazla organizasyonda çalışabilir miyim?**
C: Evet, farklı organizasyonlarda farklı rollerle çalışabilirsiniz.

**S: Mobil cihazdan kullanabilir miyim?**
C: Evet, sistem responsive tasarıma sahiptir. Telefon ve tablet'ten kullanabilirsiniz.

### Ürün Yönetimi

**S: SKU'yu değiştirebilir miyim?**
C: Hayır, SKU oluşturulduktan sonra değiştirilemez. Ürünü silip yeniden oluşturmanız gerekir.

**S: Toplu içe aktarmada hata alıyorum, ne yapmalıyım?**
C:
- CSV formatını kontrol edin (virgül ayırıcı kullanın)
- SKU'ların benzersiz olduğundan emin olun
- Sayısal değerlerde nokta kullanın (10.50 gibi)
- İlk satırın başlık olduğundan emin olun

**S: Ürün silebilir miyim?**
C: Sadece admin kullanıcılar ürün silebilir. İşlem geçmişi olan ürünleri silmek önerilmez.

### Stok Yönetimi

**S: Negatif stok olabilir mi?**
C: Evet, sistem negatif stok seviyelerine izin verir. Bu durum kırmızı uyarı ile gösterilir.

**S: Stok hareketi işlemini silebilir miyim?**
C: Hayır, audit trail koruması için işlemler silinemez. Hatalı işlem için ters işlem yapabilirsiniz.

**S: "Eşzamanlılık hatası" alıyorum, ne yapmalıyım?**
C: Başka bir kullanıcı aynı anda aynı ürünü güncellemiş. Sayfayı yenileyin ve tekrar deneyin.

### Raporlama

**S: Tüm geçmişi görebilir miyim?**
C: İşlem geçmişinde son 500 işlem gösterilir. Daha eski kayıtlar için veritabanı sorgusu gerekir.

**S: Excel formatında rapor alabilir miyim?**
C: CSV olarak dışa aktarıp Excel'de açabilirsiniz. Excel formatı gelecek bir özellik olarak eklenecek.

**S: Hangi aktiviteler loglanır?**
C: Ürün işlemleri, stok hareketleri ve kullanıcı işlemleri otomatik olarak loglanır.

### Kullanıcı ve Yetkilendirme

**S: Kendi rolümü değiştirebilir miyim?**
C: Hayır, sadece başka bir admin kullanıcı rolünüzü değiştirebilir.

**S: Warehouse staff ürün ekleyebilir mi?**
C: Hayır, sadece admin ve manager kullanıcılar ürün ekleyebilir.

**S: Viewer rolünün amacı nedir?**
C: Muhasebe, üst yönetim gibi sadece raporlara bakması gereken kişiler için uygundur.

## Klavye Kısayolları

| Kısayol | İşlev |
|---------|-------|
| `Ctrl/Cmd + K` | Ürün arama (gelecek özellik) |
| `Esc` | Açık modalı kapat |
| `Tab` | Form alanları arasında gezin |

## Destek ve Yardım

### Hata Raporlama
Bir hata ile karşılaştıysanız:
1. Hatanın ekran görüntüsünü alın
2. Yaptığınız işlemi not edin
3. Tarayıcı konsol loglarını kontrol edin (F12)
4. Sistem yöneticinize iletin

### Özellik İstekleri
Yeni özellik önerileri için sistem yöneticinizle iletişime geçin.

### En İyi Uygulamalar

1. **Düzenli Stok Sayımı**: Ayda bir fiziksel sayım yapın
2. **Referans Numarası Kullanın**: Her işlemde mutlaka referans numarası girin
3. **Minimum Stok Seviyeleri**: Doğru eşik değerleri ayarlayın
4. **Düzenli Backup**: Admin kullanıcılar düzenli olarak CSV dışa aktarımı yapmalı
5. **Güvenli Şifreler**: En az 8 karakter, büyük/küçük harf ve rakam içeren şifreler kullanın

## Güncellemeler ve Yeni Özellikler

Sistem düzenli olarak güncellenmektedir. Yeni özellikler:
- Otomatik stok uyarı e-postaları
- Grafik ve dashboard
- Barkod entegrasyonu
- Webhook desteği
- Çoklu para birimi
- Mobil uygulama

Güncellemeler hakkında bilgi almak için sistem yöneticinizle iletişimde kalın.
