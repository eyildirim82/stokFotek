# Teknik Geliştirici Kılavuzu (Developer Guide)

Bu belge, **Eksen Endüstriyel Kontrol Sistemleri** Envanter Yönetimi uygulamasının teknik mimarisini ve bakım süreçlerini gelecek geliştiriciler için açıklamaktadır.

## 🏗️ Mimari Genel Bakış

Uygulama, **Vite + React + TypeScript** tabanlı bir frontend ve **Supabase (PostgreSQL + Auth + Edge Functions)** tabanlı bir backend mimarisine sahiptir.

### Temel Dosya Yapısı
- `src/lib/auth.tsx`: Kimlik doğrulama, rol yönetimi ve organizasyon bağlamını yöneten ana Context Provider.
- `src/lib/supabase.ts`: Supabase istemci yapılandırması.
- `src/lib/activityLogger.ts`: Sistem genelindeki aktiviteleri merkezi olarak loglayan yardımcı fonksiyon.
- `src/components/`: UI bileşenleri (Ürün listesi, Stok işlemleri, Kullanıcı yönetimi vb.).
- `src/App.tsx`: Ana uygulama yapısı ve sekme/yönlendirme mantığı.

## 🗄️ Veri Modeli ve İlişkiler

Veritabanı PostgreSQL üzerinde çalışır. En kritik tasarım kararlarından biri, kullanıcı profil ve rol verilerinin `public` şemada tutulmasıdır.

### Kritik İlişkiler ve Foreign Key'ler
| Tablo | Kolon | Referans | Amaç |
|-------|-------|----------|------|
| `user_profiles` | `id` | `auth.users(id)` | Kimlik bilgilerini public şemaya bağlar. |
| `user_roles` | `user_id` | `user_profiles(id)` | Rol bazlı PostgREST join işlemlerini sağlar. |
| `user_activity_logs` | `user_id` | `user_profiles(id)` | Aktivite kayıtlarında kullanıcı adını göstermek için join sağlar. |

> [!IMPORTANT]
> **PostgREST Join Notu:** `ActivityLogs` ve `UserManagement` bileşenlerinde join işlemi yapılabilmesi için foreign key'lerin `auth.users` yerine `public.user_profiles` tablosuna işaret etmesi zorunludur.

## 🔐 Güvenlik Modeli (RBAC & RLS)

Uygulama, hem API hem de veritabanı seviyesinde güvenlik sağlar.

### Roller (Roles)
- **admin**: Tüm organizasyon ve kullanıcı verilerine tam erişim.
- **manager**: Ürün yönetimi ve raporlama yetkisi.
- **warehouse_staff**: Sadece stok giriş/çıkış yetkisi.
- **viewer**: Salt okunur (read-only) erişim.

### Row Level Security (RLS)
Sistemdeki tüm tablolarda (özellikle `products` ve `transactions`) RLS aktiftir. 
- Bir kullanıcı sadece kendi bağlı olduğu `organization_id` değerine ait verileri görebilir/değiştirebilir.
- `auth.uid()` üzerinden sorgu izolasyonu sağlanır.

## 🚀 Geliştirme Notları ve İpuçları

### Tip Güvenliği
`database.types.ts` dosyası, veritabanı şemasındaki değişikliklere göre güncellenmelidir. Herhangi bir yeni tablo eklendiğinde veya kolon değiştirildiğinde `npx supabase gen types typescript` (veya manuel güncelleme) yapılmalıdır.

### Aktivite Loglama
Yeni bir işlem türü eklendiğinde `logActivity` fonksiyonu mutlaka çağırılmalıdır:
```typescript
import { logActivity } from '../lib/activityLogger';
// ...
await logActivity(currentOrgId, 'İŞLEM_ADI', 'VARLIK_TİPİ', varlık_id, { detay: 'verisi' });
```

### Karşılaşılan Kritik Sorunlar ve Çözümleri
- **Beyaz Ekran / Sonsuz Yükleme**: Genelde veritabanı join hatalarından (Foreign Key eksikliği) veya RLS politikalarının yanlış yapılandırılmasından kaynaklanır.
- **Permission Denied (Forbidden)**: `auth.admin` API'si ön yüz tarafından çağrılmamalıdır (sunucu taraflı yetki gerektirir). Bunun yerine `user_profiles` tablosu join ile kullanılmalıdır.

## 🛠️ Bakım ve Güncelleme

1. **Dil Desteği**: Uygulama şu an tamamen Türkçe'dir. Yeni bileşen eklerken metinlerin hardcoded yerine bir lang dosyasına çıkarılması önerilir.
2. **Stok İşlemleri**: `StockOperations.tsx` bileşeni, ana ürün listesinden bağımsız, hızlı arama ve işlem yapma odaklı geliştirilmiştir. Karmaşık stok senaryoları buraya eklenmelidir.
3. **Optimistic Locking**: Ürün güncellemelerinde `version` kolonu kullanılarak eşzamanlı çakışmalar önlenmektedir. Yeni güncelleme logic'lerinde bu kolonun artırıldığından emin olun.

---
*Bu proje Eksen Endüstriyel Kontrol Sistemleri için özel olarak geliştirilmiştir.*
