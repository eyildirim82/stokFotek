# Envanter Yönetim Sistemi

Çok organizasyonlu, rol tabanlı yetkilendirme ile güçlendirilmiş kapsamlı envanter yönetim sistemi.

## Özellikler

### Temel İşlevler
- **Ürün Yönetimi**: Ürün oluşturma, düzenleme ve izleme
- **Stok Takibi**: Gerçek zamanlı stok seviyeleri ve hareket geçmişi
- **Toplu İçe Aktarma**: CSV dosyası ile toplu ürün ekleme
- **İşlem Geçmişi**: Detaylı stok hareket kayıtları ve filtreleme
- **Aktivite Kayıtları**: Kapsamlı audit trail sistemi

### Güvenlik ve Yetkilendirme
- **Çok Organizasyonlu Mimari**: Her organizasyon izole veri ile çalışır
- **Rol Tabanlı Erişim Kontrolü (RBAC)**:
  - **Admin**: Tam erişim, kullanıcı yönetimi, tüm işlemler
  - **Manager**: Ürün ve stok yönetimi, aktivite görüntüleme
  - **Warehouse Staff**: Sadece stok hareketleri
  - **Viewer**: Salt okunur erişim
- **Row Level Security (RLS)**: Supabase ile veritabanı seviyesinde güvenlik
- **Optimistic Locking**: Eşzamanlı güncellemelere karşı koruma

## Teknoloji Stack

### Frontend
- **React 18**: Modern UI framework
- **TypeScript**: Tip güvenliği
- **Vite**: Hızlı build ve geliştirme
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: İkonlar

### Backend
- **Supabase**: Backend as a Service
  - PostgreSQL veritabanı
  - Authentication
  - Row Level Security
  - Edge Functions
- **Deno**: Edge function runtime

## Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn
- Supabase hesabı

### Adımlar

1. **Depoyu klonlayın**
```bash
git clone <repository-url>
cd project
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Ortam değişkenlerini yapılandırın**

`.env` dosyasında Supabase bilgilerinizi güncelleyin:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Veritabanı migration'larını çalıştırın**

Supabase Dashboard'da SQL Editor'ü kullanarak aşağıdaki migration dosyalarını sırayla çalıştırın:
- `supabase/migrations/20260228183329_create_inventory_system_schema.sql`
- `supabase/migrations/20260228190448_add_user_profiles_and_multi_tenant_rls.sql`
- `supabase/migrations/20260228191146_add_user_roles_organizations_activity_logs.sql`

5. **Geliştirme sunucusunu başlatın**
```bash
npm run dev
```

Uygulama `http://localhost:5173` adresinde çalışacaktır.

## Kullanım

### İlk Kurulum

1. **Organizasyon Oluşturma**
   - İlk kullanıcı kayıt olduğunda, sistem otomatik olarak bir organizasyon oluşturur
   - Kullanıcı otomatik olarak admin rolü ile atanır

2. **Kullanıcı Ekleme**
   - Admin kullanıcılar, "Kullanıcılar" sekmesinden yeni kullanıcılar ekleyebilir
   - Her kullanıcıya bir rol atanmalıdır (admin, manager, warehouse_staff, viewer)

3. **Ürün Ekleme**
   - "Yeni Ürün" butonu ile tek tek ürün ekleyin
   - "Toplu İçe Aktar" ile CSV dosyası yükleyerek çoklu ürün ekleyin

### CSV İçe Aktarma Formatı

```csv
SKU,Ürün Adı,Stok,Alış Fiyatı,Liste Fiyatı
PROD-001,Örnek Ürün 1,100,10.50,15.99
PROD-002,Örnek Ürün 2,50,25.00,39.99
```

**Önemli Notlar:**
- İlk satır başlık satırı olmalıdır
- SKU benzersiz olmalıdır
- Liste Fiyatı opsiyoneldir
- Fiyatlar USD cinsinden olmalıdır

### Stok Hareketleri

1. **Stok Girişi (IN)**
   - Ürün listesinde yeşil "+" ikonuna tıklayın
   - Miktar ve referans numarası (irsaliye/fatura) girin
   - İşlem otomatik olarak kayıt altına alınır

2. **Stok Çıkışı (OUT)**
   - Ürün listesinde kırmızı "-" ikonuna tıklayın
   - Miktar ve referans numarası girin
   - Stok seviyesi otomatik olarak güncellenir

### Raporlama ve İzleme

1. **İşlem Geçmişi**
   - Tüm stok hareketlerini görüntüleyin
   - Tarih aralığı, işlem tipi ve SKU ile filtreleyin
   - CSV formatında rapor dışa aktarın

2. **Aktivite Kayıtları** (Admin/Manager)
   - Sistem genelindeki tüm aktiviteleri görüntüleyin
   - Kullanıcı bazlı aktivite takibi
   - Detaylı payload bilgisi

## Rol Yetkileri

| Özellik | Admin | Manager | Warehouse Staff | Viewer |
|---------|-------|---------|-----------------|--------|
| Ürün Görüntüleme | ✅ | ✅ | ✅ | ✅ |
| Ürün Oluşturma/Düzenleme | ✅ | ✅ | ❌ | ❌ |
| Stok Hareketi | ✅ | ✅ | ✅ | ❌ |
| İşlem Geçmişi | ✅ | ✅ | ✅ | ✅ |
| Aktivite Kayıtları | ✅ | ✅ | ❌ | ❌ |
| Kullanıcı Yönetimi | ✅ | ❌ | ❌ | ❌ |
| Toplu İçe Aktarma | ✅ | ✅ | ❌ | ❌ |

## Edge Functions

### stock-transaction
Stok hareketlerini yönetir ve doğrular.

**Endpoint:** `${SUPABASE_URL}/functions/v1/stock-transaction`

**Kullanım:**
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/stock-transaction`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    product_id: 'uuid',
    type: 'IN', // veya 'OUT'
    quantity: 10,
    reference_number: 'INV-001'
  })
});
```

## Veritabanı Şeması

### Tablolar

#### organizations
Organizasyon bilgilerini saklar.
- `id` (uuid, PK)
- `name` (text)
- `created_at` (timestamp)

#### user_profiles
Kullanıcı profil bilgileri.
- `user_id` (uuid, PK, FK -> auth.users)
- `full_name` (text)
- `default_organization_id` (uuid, FK -> organizations)
- `created_at` (timestamp)

#### user_roles
Kullanıcı-organizasyon-rol ilişkileri.
- `id` (uuid, PK)
- `user_id` (uuid, FK -> auth.users)
- `organization_id` (uuid, FK -> organizations)
- `role` (enum: admin, manager, warehouse_staff, viewer)
- `created_at` (timestamp)

#### products
Ürün kayıtları.
- `product_id` (uuid, PK)
- `organization_id` (uuid, FK -> organizations)
- `sku` (text, unique per org)
- `name` (text)
- `current_stock` (decimal)
- `min_stock_level` (decimal)
- `fixed_cost_usd` (decimal)
- `list_price_usd` (decimal, nullable)
- `version` (integer) - Optimistic locking için
- `created_at`, `updated_at` (timestamp)

#### transactions
Stok hareket kayıtları.
- `transaction_id` (uuid, PK)
- `organization_id` (uuid, FK -> organizations)
- `product_id` (uuid, FK -> products)
- `user_id` (uuid, FK -> auth.users)
- `type` (enum: IN, OUT, ADJUST)
- `quantity` (decimal)
- `reference_number` (text, nullable)
- `reason_code` (text, nullable)
- `created_at` (timestamp)

#### user_activity_logs
Sistem aktivite kayıtları.
- `log_id` (uuid, PK)
- `organization_id` (uuid, FK -> organizations)
- `user_id` (uuid, FK -> auth.users)
- `action` (text)
- `entity_type` (text)
- `entity_id` (uuid, nullable)
- `payload` (jsonb)
- `created_at` (timestamp)

## Güvenlik

### Row Level Security (RLS)

Tüm tablolar RLS ile korunmaktadır:
- Kullanıcılar sadece kendi organizasyonlarının verilerine erişebilir
- Her işlem için rol bazlı yetki kontrolü yapılır
- Veritabanı seviyesinde veri izolasyonu sağlanır

### Optimistic Locking

Stok güncellemelerinde eşzamanlılık kontrolü:
```sql
UPDATE products
SET current_stock = new_value, version = version + 1
WHERE product_id = ? AND version = current_version;
```

Eğer `version` eşleşmezse, güncelleme başarısız olur ve kullanıcıya bilgi verilir.

## Build ve Deploy

### Production Build
```bash
npm run build
```

Build çıktısı `dist/` klasöründe oluşturulur.

### Deploy
Statik dosyaları istediğiniz hosting platformuna yükleyin:
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront

### Ortam Değişkenleri (Production)
```env
VITE_SUPABASE_URL=production_supabase_url
VITE_SUPABASE_ANON_KEY=production_anon_key
```

## Sorun Giderme

### Yaygın Hatalar

1. **"Organizasyon Bulunamadı"**
   - Kullanıcı henüz bir organizasyona atanmamış
   - Admin kullanıcı ile giriş yapıp, kullanıcıyı bir organizasyona ekleyin

2. **"Yetkisiz Erişim"**
   - Kullanıcının o işlem için yeterli yetkisi yok
   - Doğru rolün atandığından emin olun

3. **"Stok güncelleme başarısız"**
   - Başka bir kullanıcı aynı anda ürünü güncellemiş
   - Sayfayı yenileyip tekrar deneyin

4. **Migration Hataları**
   - Migration'ları doğru sırayla çalıştırdığınızdan emin olun
   - Supabase Dashboard'da hata loglarını kontrol edin

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## İletişim

Sorularınız veya geri bildirimleriniz için lütfen issue açın.
