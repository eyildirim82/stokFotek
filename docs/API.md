# API Dokümantasyonu

## Edge Functions

### Genel Bilgiler

Tüm Edge Functions için:
- **Base URL**: `${VITE_SUPABASE_URL}/functions/v1`
- **Authentication**: Bearer token (Supabase Anon Key veya User JWT)
- **Content-Type**: `application/json`

### CORS Headers

Tüm istekler aşağıdaki CORS header'larını destekler:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey
```

## stock-transaction

Stok hareketlerini yönetir ve doğrular.

### Endpoint
```
POST /functions/v1/stock-transaction
```

### Authentication
✅ Gerekli - Bearer token ile

### Request Headers
```http
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

### Request Body
```typescript
{
  product_id: string;      // UUID
  type: 'IN' | 'OUT';      // Stok giriş veya çıkış
  quantity: number;        // Pozitif sayı
  reference_number?: string; // Opsiyonel irsaliye/fatura no
  organization_id: string; // UUID
}
```

### Response

#### Başarılı (200 OK)
```json
{
  "success": true,
  "message": "Stok hareketi başarıyla kaydedildi",
  "data": {
    "transaction_id": "uuid",
    "product_id": "uuid",
    "type": "IN",
    "quantity": 10,
    "new_stock": 110,
    "reference_number": "INV-001",
    "created_at": "2026-02-28T12:00:00Z"
  }
}
```

#### Hata (400 Bad Request)
```json
{
  "success": false,
  "error": "Geçersiz miktar",
  "code": "INVALID_QUANTITY"
}
```

#### Hata (404 Not Found)
```json
{
  "success": false,
  "error": "Ürün bulunamadı",
  "code": "PRODUCT_NOT_FOUND"
}
```

#### Hata (409 Conflict)
```json
{
  "success": false,
  "error": "Stok güncellemesi başarısız - eşzamanlılık hatası",
  "code": "CONCURRENT_UPDATE"
}
```

### Örnek Kullanım

#### JavaScript/TypeScript
```typescript
import { supabase } from './supabase';

async function createStockTransaction(
  productId: string,
  type: 'IN' | 'OUT',
  quantity: number,
  referenceNumber?: string
) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Kullanıcı giriş yapmamış');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-transaction`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        type,
        quantity,
        reference_number: referenceNumber,
        organization_id: currentOrgId
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Stok hareketi başarısız');
  }

  return await response.json();
}

// Kullanım
try {
  const result = await createStockTransaction(
    'product-uuid',
    'IN',
    100,
    'PO-12345'
  );
  console.log('İşlem başarılı:', result);
} catch (error) {
  console.error('Hata:', error.message);
}
```

#### cURL
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/stock-transaction \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "product_id": "uuid-here",
    "type": "IN",
    "quantity": 50,
    "reference_number": "INV-001",
    "organization_id": "org-uuid"
  }'
```

## Supabase Client SDK Kullanımı

### Authentication

#### Kayıt
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      full_name: 'John Doe'
    }
  }
});
```

#### Giriş
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
});
```

#### Çıkış
```typescript
await supabase.auth.signOut();
```

#### Auth State Değişikliklerini İzleme
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  (async () => {
    if (event === 'SIGNED_IN') {
      console.log('Kullanıcı giriş yaptı', session?.user);
    } else if (event === 'SIGNED_OUT') {
      console.log('Kullanıcı çıkış yaptı');
    }
  })();
});
```

### Database Operations

#### Ürünleri Listeleme
```typescript
const { data: products, error } = await supabase
  .from('products')
  .select('*')
  .eq('organization_id', currentOrgId)
  .order('created_at', { ascending: false });
```

#### Ürün Ekleme
```typescript
const { data: product, error } = await supabase
  .from('products')
  .insert({
    sku: 'PROD-001',
    name: 'Example Product',
    current_stock: 100,
    fixed_cost_usd: 10.50,
    list_price_usd: 15.99,
    min_stock_level: 10,
    organization_id: currentOrgId
  })
  .select()
  .single();
```

#### Ürün Güncelleme (Optimistic Locking ile)
```typescript
const { data: updatedProduct, error } = await supabase
  .from('products')
  .update({
    current_stock: newStock,
    version: product.version + 1
  })
  .eq('product_id', productId)
  .eq('version', product.version)
  .select();

if (!updatedProduct || updatedProduct.length === 0) {
  throw new Error('Eşzamanlılık hatası - ürün güncellenmiş');
}
```

#### İşlem Geçmişi
```typescript
const { data: transactions, error } = await supabase
  .from('transactions')
  .select(`
    *,
    products:product_id (sku, name)
  `)
  .eq('organization_id', currentOrgId)
  .order('created_at', { ascending: false })
  .limit(100);
```

#### Aktivite Kayıtları (Admin/Manager)
```typescript
const { data: logs, error } = await supabase
  .from('user_activity_logs')
  .select(`
    *,
    user_profiles:user_id (full_name)
  `)
  .eq('organization_id', currentOrgId)
  .order('created_at', { ascending: false });
```

## Hata Kodları

| Kod | Açıklama | HTTP Status |
|-----|----------|-------------|
| `INVALID_QUANTITY` | Miktar 0 veya negatif | 400 |
| `PRODUCT_NOT_FOUND` | Ürün bulunamadı | 404 |
| `UNAUTHORIZED` | Yetkisiz erişim | 401 |
| `FORBIDDEN` | Yasak işlem - yetersiz rol | 403 |
| `CONCURRENT_UPDATE` | Eşzamanlı güncelleme hatası | 409 |
| `DUPLICATE_SKU` | SKU zaten mevcut | 409 |
| `ORGANIZATION_NOT_FOUND` | Organizasyon bulunamadı | 404 |
| `INSUFFICIENT_STOCK` | Yetersiz stok (çıkış için) | 400 |

## Rate Limiting

Edge Functions için rate limiting bulunmamaktadır, ancak makul kullanım beklenir.

## Best Practices

### 1. Error Handling
Her zaman try-catch bloğu kullanın:
```typescript
try {
  const result = await supabase.from('products').select('*');
  if (result.error) throw result.error;
  return result.data;
} catch (error) {
  console.error('Veritabanı hatası:', error);
  // Kullanıcıya uygun hata mesajı gösterin
}
```

### 2. Optimistic Locking
Stok güncellemelerinde her zaman version kontrolü yapın:
```typescript
const { data, error } = await supabase
  .from('products')
  .update({ current_stock: newStock, version: product.version + 1 })
  .eq('product_id', productId)
  .eq('version', product.version)
  .select();

if (!data || data.length === 0) {
  // Eşzamanlılık hatası - kullanıcıyı bilgilendirin
  alert('Ürün başka bir kullanıcı tarafından güncellendi. Lütfen sayfayı yenileyin.');
}
```

### 3. Pagination
Büyük veri setleri için pagination kullanın:
```typescript
const PAGE_SIZE = 50;

const { data, error, count } = await supabase
  .from('products')
  .select('*', { count: 'exact' })
  .eq('organization_id', currentOrgId)
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

### 4. Selective Queries
Sadece ihtiyacınız olan kolonları seçin:
```typescript
// Kötü
const { data } = await supabase.from('products').select('*');

// İyi
const { data } = await supabase
  .from('products')
  .select('product_id, sku, name, current_stock');
```

### 5. Transaction Safety
Birden fazla ilişkili işlem için backend'de transaction kullanın (Edge Function'da).

## Webhook'lar (Gelecek Özellik)

Gelecekte webhook desteği eklenecek:
- Stok seviyesi düşük uyarıları
- Yeni ürün ekleme bildirimleri
- Kullanıcı aktivite bildirimleri
