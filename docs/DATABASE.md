# Veritabanı Şeması Dokümantasyonu

## Genel Bakış

Bu sistem PostgreSQL veritabanı kullanır ve Supabase Row Level Security (RLS) ile güvenli hale getirilmiştir. Sistem çok organizasyonlu (multi-tenant) mimariye sahiptir ve her organizasyon verilerini izole bir şekilde saklar.

## Entity Relationship Diagram (ERD)

```
┌─────────────────────┐
│   organizations     │
├─────────────────────┤
│ id (PK)            │
│ name               │
│ created_at         │
└──────────┬──────────┘
           │
           │ 1:N
           │
    ┌──────┴──────────────────────────────┐
    │                                     │
┌───┴──────────────┐            ┌─────────┴─────────┐
│  user_profiles   │            │    products       │
├──────────────────┤            ├───────────────────┤
│ user_id (PK,FK) │            │ product_id (PK)   │
│ full_name       │            │ organization_id   │
│ default_org_id  │            │ sku               │
│ created_at      │            │ name              │
└────────┬─────────┘            │ current_stock     │
         │                      │ min_stock_level   │
         │ 1:N                  │ fixed_cost_usd    │
         │                      │ list_price_usd    │
    ┌────┴────────┐            │ version           │
    │ user_roles  │            │ created_at        │
    ├─────────────┤            │ updated_at        │
    │ id (PK)     │            └─────────┬─────────┘
    │ user_id     │                      │
    │ org_id      │                      │ 1:N
    │ role        │                      │
    │ created_at  │            ┌─────────┴──────────┐
    └─────────────┘            │   transactions     │
                               ├────────────────────┤
                               │ transaction_id (PK)│
                               │ organization_id    │
                               │ product_id (FK)    │
                               │ user_id (FK)       │
                               │ type               │
                               │ quantity           │
                               │ reference_number   │
                               │ reason_code        │
                               │ created_at         │
                               └────────────────────┘

┌──────────────────────────┐
│  user_activity_logs      │
├──────────────────────────┤
│ log_id (PK)             │
│ organization_id (FK)     │
│ user_id (FK)            │
│ action                  │
│ entity_type             │
│ entity_id               │
│ payload                 │
│ created_at              │
└──────────────────────────┘
```

## Tablolar

### organizations

Organizasyon bilgilerini saklar. Her organizasyon izole bir şekilde çalışır.

| Kolon | Tip | Nullable | Default | Açıklama |
|-------|-----|----------|---------|----------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| name | text | NO | - | Organizasyon adı |
| created_at | timestamptz | NO | now() | Oluşturulma zamanı |

**İndeksler:**
- PRIMARY KEY (id)

**RLS Policies:**
- Kullanıcılar sadece üye oldukları organizasyonları görebilir
- Yeni organizasyon oluşturma herkese açık (ilk kayıt için)

**Örnek:**
```sql
INSERT INTO organizations (name) VALUES ('Acme Corp');
```

---

### user_profiles

Kullanıcı profil bilgilerini saklar. Her kullanıcı için tek bir profil vardır.

| Kolon | Tip | Nullable | Default | Açıklama |
|-------|-----|----------|---------|----------|
| user_id | uuid | NO | - | Primary Key, FK -> auth.users(id) |
| full_name | text | NO | - | Kullanıcının tam adı |
| default_organization_id | uuid | YES | NULL | FK -> organizations(id) |
| created_at | timestamptz | NO | now() | Profil oluşturulma zamanı |

**İndeksler:**
- PRIMARY KEY (user_id)
- FOREIGN KEY (default_organization_id) REFERENCES organizations(id)

**RLS Policies:**
- Kullanıcılar sadece kendi profillerini görebilir ve güncelleyebilir
- Profil oluşturma authenticated kullanıcılara açık

**Örnek:**
```sql
INSERT INTO user_profiles (user_id, full_name, default_organization_id)
VALUES (auth.uid(), 'John Doe', 'org-uuid');
```

---

### user_roles

Kullanıcı-organizasyon-rol ilişkilerini saklar. Bir kullanıcı birden fazla organizasyonda farklı rollerle olabilir.

| Kolon | Tip | Nullable | Default | Açıklama |
|-------|-----|----------|---------|----------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| user_id | uuid | NO | - | FK -> auth.users(id) |
| organization_id | uuid | NO | - | FK -> organizations(id) |
| role | user_role | NO | - | Kullanıcı rolü (enum) |
| created_at | timestamptz | NO | now() | Rol atama zamanı |

**Enum Types:**
```sql
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'warehouse_staff', 'viewer');
```

**Roller:**
- `admin`: Tam erişim, kullanıcı yönetimi
- `manager`: Ürün ve stok yönetimi
- `warehouse_staff`: Sadece stok hareketleri
- `viewer`: Salt okunur erişim

**İndeksler:**
- PRIMARY KEY (id)
- UNIQUE (user_id, organization_id)
- FOREIGN KEY (user_id) REFERENCES auth.users(id)
- FOREIGN KEY (organization_id) REFERENCES organizations(id)

**RLS Policies:**
- Kullanıcılar kendi rollerini görebilir
- Sadece admin kullanıcılar rol ekleyebilir/düzenleyebilir

**Örnek:**
```sql
INSERT INTO user_roles (user_id, organization_id, role)
VALUES (auth.uid(), 'org-uuid', 'manager');
```

---

### products

Ürün katalog bilgilerini saklar.

| Kolon | Tip | Nullable | Default | Açıklama |
|-------|-----|----------|---------|----------|
| product_id | uuid | NO | gen_random_uuid() | Primary Key |
| organization_id | uuid | NO | - | FK -> organizations(id) |
| sku | text | NO | - | Ürün kodu (organizasyon içinde unique) |
| name | text | NO | - | Ürün adı |
| current_stock | decimal(12,2) | NO | 0 | Mevcut stok miktarı |
| min_stock_level | decimal(12,2) | YES | 10 | Minimum stok seviyesi |
| fixed_cost_usd | decimal(12,2) | NO | - | Alış fiyatı (USD) |
| list_price_usd | decimal(12,2) | YES | NULL | Liste/satış fiyatı (USD) |
| version | integer | NO | 1 | Optimistic locking için |
| created_at | timestamptz | NO | now() | Oluşturulma zamanı |
| updated_at | timestamptz | NO | now() | Son güncellenme zamanı |

**İndeksler:**
- PRIMARY KEY (product_id)
- UNIQUE (organization_id, sku)
- INDEX (organization_id)
- FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE

**Triggers:**
```sql
-- updated_at otomatik güncelleme
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**RLS Policies:**
- Kullanıcılar sadece kendi organizasyonlarının ürünlerini görebilir
- Admin ve manager kullanıcılar ürün ekleyebilir/düzenleyebilir
- Ürün silme admin kullanıcılara özel

**Örnek:**
```sql
INSERT INTO products (
  organization_id, sku, name, current_stock,
  fixed_cost_usd, list_price_usd, min_stock_level
)
VALUES (
  'org-uuid', 'PROD-001', 'Example Product', 100,
  10.50, 15.99, 10
);
```

---

### transactions

Stok hareketlerini (giriş, çıkış, düzeltme) kaydeder.

| Kolon | Tip | Nullable | Default | Açıklama |
|-------|-----|----------|---------|----------|
| transaction_id | uuid | NO | gen_random_uuid() | Primary Key |
| organization_id | uuid | NO | - | FK -> organizations(id) |
| product_id | uuid | NO | - | FK -> products(product_id) |
| user_id | uuid | YES | NULL | İşlemi yapan kullanıcı |
| type | transaction_type | NO | - | İşlem tipi (enum) |
| quantity | decimal(12,2) | NO | - | Miktar (+ veya -) |
| reference_number | text | YES | NULL | İrsaliye/fatura numarası |
| reason_code | text | YES | NULL | İşlem nedeni kodu |
| created_at | timestamptz | NO | now() | İşlem zamanı |

**Enum Types:**
```sql
CREATE TYPE transaction_type AS ENUM ('IN', 'OUT', 'ADJUST');
```

**İşlem Tipleri:**
- `IN`: Stok girişi (quantity pozitif)
- `OUT`: Stok çıkışı (quantity negatif)
- `ADJUST`: Stok düzeltmesi (sayım, fire vb.)

**İndeksler:**
- PRIMARY KEY (transaction_id)
- INDEX (organization_id, created_at DESC)
- INDEX (product_id)
- FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
- FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL

**RLS Policies:**
- Kullanıcılar sadece kendi organizasyonlarının işlemlerini görebilir
- Admin, manager ve warehouse_staff işlem ekleyebilir
- İşlem silme/düzenleme yasak (audit trail)

**Örnek:**
```sql
-- Stok girişi
INSERT INTO transactions (
  organization_id, product_id, user_id, type,
  quantity, reference_number
)
VALUES (
  'org-uuid', 'product-uuid', auth.uid(), 'IN',
  50, 'PO-12345'
);

-- Stok çıkışı
INSERT INTO transactions (
  organization_id, product_id, user_id, type,
  quantity, reference_number
)
VALUES (
  'org-uuid', 'product-uuid', auth.uid(), 'OUT',
  -25, 'INV-67890'
);
```

---

### user_activity_logs

Sistem genelindeki kullanıcı aktivitelerini kaydeder (audit trail).

| Kolon | Tip | Nullable | Default | Açıklama |
|-------|-----|----------|---------|----------|
| log_id | uuid | NO | gen_random_uuid() | Primary Key |
| organization_id | uuid | NO | - | FK -> organizations(id) |
| user_id | uuid | YES | NULL | İşlemi yapan kullanıcı |
| action | text | NO | - | Yapılan işlem (create, update, delete vb.) |
| entity_type | text | YES | NULL | Etkilenen varlık tipi (product, user vb.) |
| entity_id | uuid | YES | NULL | Etkilenen varlık ID'si |
| payload | jsonb | YES | NULL | İşlem detayları |
| created_at | timestamptz | NO | now() | Log zamanı |

**İndeksler:**
- PRIMARY KEY (log_id)
- INDEX (organization_id, created_at DESC)
- INDEX (user_id, created_at DESC)
- INDEX ON payload USING GIN
- FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL

**RLS Policies:**
- Sadece admin ve manager kullanıcılar logları görebilir
- Loglar sadece okunabilir (INSERT only)

**Yaygın Action Değerleri:**
- `create`: Yeni kayıt oluşturma
- `update`: Kayıt güncelleme
- `delete`: Kayıt silme
- `stock_in`: Stok girişi
- `stock_out`: Stok çıkışı
- `BULK_IMPORT`: Toplu içe aktarma
- `login`: Kullanıcı girişi
- `logout`: Kullanıcı çıkışı

**Örnek:**
```sql
INSERT INTO user_activity_logs (
  organization_id, user_id, action,
  entity_type, entity_id, payload
)
VALUES (
  'org-uuid', auth.uid(), 'create',
  'product', 'product-uuid',
  '{"sku": "PROD-001", "name": "New Product", "initial_stock": 100}'::jsonb
);
```

## Row Level Security (RLS) Policies

### Genel Prensipler

1. **Organizasyon İzolasyonu**: Her kullanıcı sadece üye olduğu organizasyonların verilerine erişebilir
2. **Rol Bazlı Erişim**: İşlemler kullanıcının rolüne göre kısıtlanır
3. **Audit Trail Koruması**: Log kayıtları silinemez, sadece okunabilir

### Policy Örnekleri

#### products tablosu

```sql
-- SELECT policy: Kullanıcılar kendi org ürünlerini görebilir
CREATE POLICY "Users can view own org products"
  ON products FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- INSERT policy: Admin ve manager ürün ekleyebilir
CREATE POLICY "Admins and managers can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- UPDATE policy: Admin ve manager ürün güncelleyebilir
CREATE POLICY "Admins and managers can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- DELETE policy: Sadece admin silebilir
CREATE POLICY "Only admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

#### transactions tablosu

```sql
-- SELECT policy
CREATE POLICY "Users can view own org transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- INSERT policy: Admin, manager ve warehouse_staff ekleyebilir
CREATE POLICY "Staff can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'warehouse_staff')
    )
  );

-- UPDATE ve DELETE yasak (audit trail koruması)
```

## Optimistic Locking

Stok güncellemelerinde eşzamanlı erişim kontrolü için `version` kolonunu kullanırız.

### Nasıl Çalışır?

1. Ürün okunurken mevcut `version` değeri alınır
2. Güncelleme yapılırken hem `product_id` hem de `version` eşleşmelidir
3. Güncelleme başarılı olursa `version` 1 artırılır
4. Eğer başka bir kullanıcı arada güncelleme yaptıysa, `version` eşleşmez ve güncelleme başarısız olur

### Örnek Kullanım

```sql
-- Adım 1: Ürünü oku
SELECT product_id, current_stock, version
FROM products
WHERE product_id = 'uuid';
-- Sonuç: current_stock=100, version=5

-- Adım 2: Başka kullanıcı güncelleme yapıyor
UPDATE products
SET current_stock = 110, version = 6
WHERE product_id = 'uuid' AND version = 5;
-- Başarılı

-- Adım 3: İlk kullanıcı güncelleme yapmaya çalışıyor
UPDATE products
SET current_stock = 95, version = 6
WHERE product_id = 'uuid' AND version = 5;
-- Başarısız! 0 satır güncellendi çünkü version artık 6
```

## Performans Optimizasyonu

### İndeksler

```sql
-- Organizasyon bazlı sorgular için
CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_transactions_organization ON transactions(organization_id, created_at DESC);

-- SKU aramaları için
CREATE INDEX idx_products_sku ON products(organization_id, sku);

-- JSONB sorguları için
CREATE INDEX idx_activity_logs_payload ON user_activity_logs USING GIN(payload);
```

### Sorgu Önerileri

1. **SELECT spesifik kolonlar**: `SELECT *` yerine sadece ihtiyacınız olan kolonları seçin
2. **LIMIT kullanın**: Büyük sonuç setleri için pagination uygulayın
3. **Index'leri kullanın**: WHERE koşullarınız index'li kolonlarda olsun
4. **JOIN yerine nested select**: RLS ile çalışırken bazen nested select daha performanslı olabilir

## Backup ve Recovery

### Otomatik Backup
Supabase otomatik olarak günlük backup alır (plan'a bağlı olarak).

### Manuel Backup
```bash
# pg_dump ile
pg_dump -h db.project.supabase.co -U postgres -d postgres > backup.sql

# Restore
psql -h db.project.supabase.co -U postgres -d postgres < backup.sql
```

### Point-in-Time Recovery
Supabase Pro ve üzeri planlar PITR destekler.

## Migration Yönetimi

Migration dosyaları `supabase/migrations/` klasöründe timestamp ile sıralanır.

### Migration Sırası
1. `20260228183329_create_inventory_system_schema.sql`
2. `20260228190448_add_user_profiles_and_multi_tenant_rls.sql`
3. `20260228191146_add_user_roles_organizations_activity_logs.sql`

Her migration dosyası:
- İdempotent olmalı (`IF NOT EXISTS` kullanın)
- Rollback planı içermeli
- Detaylı yorum içermeli
